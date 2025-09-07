import { supabase } from "@/supabaseClient";
import { useAuth } from "./useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Task } from "@/types/task";

export const useGetTasks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  async function fetchTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data as Task[];
  }

  useEffect(() => {
    if (!user) return;

    const eventsChannel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("INSERT received:", payload);
          queryClient.setQueryData<Task[]>(["tasks"], (oldData = []) => {
            return [payload.new as Task, ...oldData];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("UPDATE received:", payload);
          queryClient.setQueryData<Task[]>(["tasks"], (oldData = []) => {
            return oldData.map((task) =>
              task.id === payload.new.id ? (payload.new as Task) : task
            );
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "tasks",
          // No filter on user_id because the line is already deleted
        },
        (payload) => {
          console.log("DELETE received:", payload);
          // Check if the deleted task is in our list before updating
          queryClient.setQueryData<Task[]>(["tasks"], (oldData = []) => {
            return oldData.filter((task) => task.id !== payload.old.id);
          });
        }
      )
      .subscribe();

    // Cleaning
    return () => {
      console.log("Cleaning real-time subscriptions");
      supabase.removeChannel(eventsChannel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
    enabled: !!user,
  });
};
