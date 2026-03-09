import { useEffect, useState } from "react";
import { useListTodos } from "@/api/generated/todos/todos";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { SkeletonRow } from "@/components/SkeletonRow";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TodoForm } from "@/components/TodoForm";
import { TodoSection } from "@/components/TodoSection";
import { useTodoMutations } from "@/hooks/useTodoMutations";

function App() {
  const {
    data: todosResponse,
    isPending,
    isError: isFetchError,
  } = useListTodos();
  const todos = todosResponse?.data ?? [];

  const active = todos.filter((t) => t.is_completed !== true);
  const completed = todos.filter((t) => t.is_completed === true);

  const [error, setError] = useState<string | null>(null);
  const { handleCreate, handleToggle, handleDelete } =
    useTodoMutations(setError);

  useEffect(() => {
    if (!isFetchError && todosResponse !== undefined) {
      setError(null);
    }
  }, [todosResponse, isFetchError]);

  const errorMessage = isFetchError ? "Network issue" : error;

  return (
    <ThemeProvider>
      <main className="max-w-2xl mx-auto py-4 sm:py-8">
        <AppHeader />
        {errorMessage && <ErrorBanner message={errorMessage} />}
        <div className="mt-4">
          {isPending ? (
            <ul>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </ul>
          ) : (
            <>
              <TodoSection
                label="Completed"
                todos={completed}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
              <TodoSection
                label="Active"
                todos={active}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            </>
          )}
          <TodoForm onCreate={handleCreate} />
        </div>
      </main>
    </ThemeProvider>
  );
}

export default App;
