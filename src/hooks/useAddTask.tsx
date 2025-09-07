import { useMutation } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { supabase } from "@/supabaseClient";

export const useAddTask = () => {
  const { user } = useAuth();

  async function addTask(newTask: string) {
    if (!newTask.trim()) return;

    const { error } = await supabase.from("tasks").insert([
      {
        text: newTask,
        user_id: user.id,
      },
    ]);

    if (error) {
      console.error(error);
      throw error;
    }
  }

  return useMutation({
    mutationFn: addTask,
  });
};
