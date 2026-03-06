import { Trash2 } from "lucide-react";
import type { TodoPublic } from "@/api/generated/todoBmadAPI.schemas";
import { TodoRow } from "@/components/TodoRow";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils";

interface TodoItemProps {
  todo: TodoPublic;
  onToggle?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const isCompleted = todo.is_completed === true;
  const formattedDate = new Date(todo.created_at).toLocaleString();

  return (
    <TodoRow
      onClick={() => onToggle?.(todo.id)}
      left={
        <Checkbox
          checked={isCompleted}
          aria-label={isCompleted ? "Mark as active" : "Mark as complete"}
          onCheckedChange={() => onToggle?.(todo.id)}
          onClick={(e) => e.stopPropagation()}
        />
      }
      content={
        <div>
          <p
            className={cn(
              "text-sm",
              isCompleted && "line-through text-[var(--muted-foreground)]",
            )}
          >
            {todo.text}
          </p>
          <time
            dateTime={todo.created_at}
            className="text-xs text-[var(--muted-foreground)]"
          >
            {formattedDate}
          </time>
        </div>
      }
      right={
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete todo"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(todo.id);
          }}
        >
          <Trash2 className="h-4 w-4 text-[var(--muted-foreground)] hover:text-[var(--destructive)]" />
        </Button>
      }
    />
  );
}
