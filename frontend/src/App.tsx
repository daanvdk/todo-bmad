import { useListTodos } from "@/api/generated/todos/todos";
import { AppHeader } from "@/components/AppHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TodoForm } from "@/components/TodoForm";
import { TodoSection } from "@/components/TodoSection";

function App() {
  const { data: todosResponse } = useListTodos();
  const todos = todosResponse?.data ?? [];

  const active = todos.filter((t) => t.is_completed !== true);
  const completed = todos.filter((t) => t.is_completed === true);

  return (
    <ThemeProvider>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <AppHeader />
        <div className="mt-4">
          <TodoSection label="Completed" todos={completed} />
          <TodoSection label="Active" todos={active} />
          <TodoForm />
        </div>
      </main>
    </ThemeProvider>
  );
}

export default App;
