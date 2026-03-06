import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { listTodosResponse } from "@/api/generated/todos/todos";
import {
  getListTodosQueryKey,
  useCreateTodo,
  useListTodos,
} from "@/api/generated/todos/todos";
import { AppHeader } from "@/components/AppHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TodoForm } from "@/components/TodoForm";
import { TodoSection } from "@/components/TodoSection";

function App() {
  const { data: todosResponse } = useListTodos();
  const todos = todosResponse?.data ?? [];

  const active = todos.filter((t) => t.is_completed !== true);
  const completed = todos.filter((t) => t.is_completed === true);

  const [_error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { mutate: createTodo } = useCreateTodo({
    mutation: {
      onMutate: async ({ data: newTodo }) => {
        await queryClient.cancelQueries({ queryKey: getListTodosQueryKey() });
        const snapshot = queryClient.getQueryData<listTodosResponse>(
          getListTodosQueryKey(),
        );
        queryClient.setQueryData<listTodosResponse>(
          getListTodosQueryKey(),
          (old) => {
            if (!old) return old;
            const optimisticTodo = {
              id: -Date.now(),
              text: newTodo.text,
              is_completed: false as const,
              created_at: new Date().toISOString(),
            };
            return { ...old, data: [...old.data, optimisticTodo] };
          },
        );
        return { snapshot };
      },
      onError: (_err, _variables, context) => {
        if (context?.snapshot) {
          queryClient.setQueryData(getListTodosQueryKey(), context.snapshot);
        }
        setError("Failed to save");
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      },
    },
  });

  const handleCreate = (text: string) => {
    createTodo({ data: { text } });
  };

  return (
    <ThemeProvider>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <AppHeader />
        <div className="mt-4">
          <TodoSection label="Completed" todos={completed} />
          <TodoSection label="Active" todos={active} />
          <TodoForm onCreate={handleCreate} />
        </div>
      </main>
    </ThemeProvider>
  );
}

export default App;
