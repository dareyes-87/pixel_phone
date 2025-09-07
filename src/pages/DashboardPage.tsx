import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { useGetTasks } from "@/hooks/useGetTasks";
import { useSignOut } from "@/hooks/useSignOut";
import { useDeleteTask } from "@/hooks/useDeleteTask";
import { useAddTask } from "@/hooks/useAddTask";
import { toast } from "react-toastify";
import Layout from "./Layout";

export default function DashboardPage() {
  const { user } = useAuth();
  const { register, handleSubmit, reset } = useForm<{ text: string }>();
  const { data, isLoading } = useGetTasks();
  const { mutate: handleAddTask } = useAddTask();
  const { mutate: handleSignOut } = useSignOut();
  const { mutate: handleDelete } = useDeleteTask();

  const onDelete = (id: string) => {
    handleDelete(id, {
      onSuccess: () => {
        toast.success("Task deleted successfully");
      },
      onError: () => {
        toast.error("An error occurred while deleting the task");
      },
    });
  };

  const onSubmit = (data: { text: string }) => {
    handleAddTask(data.text, {
      onSuccess: () => {
        toast.success("Task added successfully");
        reset();
      },
      onError: () => {
        toast.error("An error occurred while adding the task");
      },
    });
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-4 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h1 className="text-2xl font-bold">My tasks</h1>
              </div>
              <div className="flex items-center bg-indigo-700/50 rounded-full px-4 py-2 text-sm">
                <span className="mr-2 truncate max-w-[150px] sm:max-w-xs">
                  {user.email}
                </span>
                <button
                  onClick={() => handleSignOut()}
                  className="ml-2 cursor-pointer text-indigo-500 hover:text-white transition-colors flex items-center p-2 bg-indigo-100 hover:bg-indigo-600 rounded-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Add form */}
          <div className="px-6 py-5 border-b border-gray-100">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col md:flex-row gap-2">
                <textarea
                  className="flex-1 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  {...register("text", { required: true })}
                  placeholder="Add a new task..."
                />
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-5 py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-md cursor-pointer flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* List of items */}
          <div className="px-6 py-5">
            <h2 className="text-lg font-medium text-gray-700 mb-4">
              My tasks ({data?.length || 0})
            </h2>

            {isLoading ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-16 w-16 mx-auto text-gray-300 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-gray-500 text-lg">
                      No task for the moment
                    </p>
                    <p className="text-gray-400 mt-1">
                      Add your first task above
                    </p>
                  </div>
                ) : (
                  data?.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors group"
                    >
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></span>
                        <span className="text-gray-700">{item.text}</span>
                      </div>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="cursor-pointer text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100"
                        aria-label="Supprimer"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Footer */}
            {data && data.length > 0 && (
              <div className="mt-8 pt-4 border-t border-gray-100 text-center text-sm text-gray-500">
                Tip: Click on a task to mark it as completed
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
