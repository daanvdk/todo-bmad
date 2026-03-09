import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TodoRow } from "@/components/TodoRow";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface TodoFormProps {
  onCreate?: (text: string) => void;
}

export function TodoForm({ onCreate }: TodoFormProps) {
  const [text, setText] = useState("");
  const hasText = text.trim().length > 0;
  const rowRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const handleClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      el.querySelector("input")?.focus();
    };
    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasText) {
      onCreate?.(text.trim());
      setText("");
    }
  };

  return (
    <TodoRow
      ref={rowRef}
      as="form"
      onSubmit={handleSubmit}
      className="rounded-lg cursor-text hover:bg-[var(--muted)] focus-within:bg-[var(--muted)]"
      left={
        <svg
          className="h-4 w-4 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="8"
            cy="8"
            r="7"
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        </svg>
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
          <Plus className="h-4 w-4" />
        </Button>
      }
    />
  );
}
