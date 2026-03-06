import type { TodoPublic } from "@/api/generated/todoBmadAPI.schemas";
import { TodoItem } from "@/components/TodoItem";

interface TodoSectionProps {
  label: string;
  todos: TodoPublic[];
  onToggle?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function TodoSection({
  label,
  todos,
  onToggle,
  onDelete,
}: TodoSectionProps) {
  if (todos.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)] px-4 pt-4 pb-1">
        {label}
      </p>
      <ul>
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
}
