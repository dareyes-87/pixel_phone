import { supabase } from "@/supabaseClient";
import { useAuth } from "./useAuth";
import { useMutation } from "@tanstack/react-query";

export const useDeleteTask = () => {
  const { user } = useAuth();

  async function deleteTask(id: string) {
    if (!user) {
      return;
    }

    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error(error);
      throw error;
    }
  }

  return useMutation({
    mutationFn: deleteTask,
  });
};
