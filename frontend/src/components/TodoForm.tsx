import { Plus } from "lucide-react";
import { useState } from "react";
import { TodoRow } from "@/components/TodoRow";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface TodoFormProps {
  onCreate?: (text: string) => void;
}

export function TodoForm({ onCreate }: TodoFormProps) {
  const [text, setText] = useState("");
  const hasText = text.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasText) {
      onCreate?.(text.trim());
      setText("");
    }
  };

  return (
    <TodoRow
      as="form"
      onSubmit={handleSubmit}
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
      }
      right={
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Add todo"
          disabled={!hasText}
        >
          <Plus className="h-4 w-4 text-[var(--muted-foreground)]" />
        </Button>
      }
    />
  );
}
