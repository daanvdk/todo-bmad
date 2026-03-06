import { TodoRow } from "@/components/TodoRow";
import { Input } from "@/components/ui/Input";

export function TodoForm() {
  return (
    <TodoRow
      as="div"
      left={
        <div
          className="h-4 w-4 shrink-0 rounded-full border border-[var(--border)] opacity-40"
          aria-hidden="true"
        />
      }
      content={
        <Input
          type="text"
          placeholder="Add a task…"
          aria-label="Add a task"
          maxLength={500}
        />
      }
    />
  );
}
