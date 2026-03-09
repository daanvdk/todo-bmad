import { type FormEvent, forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TodoRowProps {
  as?: "li" | "div" | "form";
  left: ReactNode;
  content: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  onSubmit?: (e: FormEvent<HTMLElement>) => void;
  className?: string;
  "aria-hidden"?: true;
}

export const TodoRow = forwardRef<HTMLElement, TodoRowProps>(function TodoRow(
  {
    as: Tag = "li",
    left,
    content,
    right,
    onClick,
    onSubmit,
    className,
    "aria-hidden": ariaHidden,
  },
  ref,
) {
  return (
    <Tag
      ref={ref as React.Ref<HTMLFormElement & HTMLLIElement & HTMLDivElement>}
      className={cn(
        "flex min-h-[44px] items-center gap-3 py-2 sm:py-3 px-4",
        onClick &&
          "cursor-pointer rounded-lg hover:bg-[var(--muted)] transition-colors",
        className,
      )}
      onClick={onClick}
      onSubmit={Tag === "form" ? onSubmit : undefined}
      aria-hidden={ariaHidden}
    >
      <div className="flex-shrink-0">{left}</div>
      <div className="flex-1 min-w-0">{content}</div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </Tag>
  );
});
