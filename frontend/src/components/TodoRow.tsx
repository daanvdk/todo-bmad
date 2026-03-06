import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TodoRowProps {
  as?: "li" | "div" | "form";
  left: ReactNode;
  content: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function TodoRow({
  as: Tag = "li",
  left,
  content,
  right,
  onClick,
  className,
}: TodoRowProps) {
  const handleKeyDown = onClick
    ? (e: KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  return (
    <Tag
      className={cn(
        "flex min-h-[44px] items-center gap-3 py-3 px-4",
        onClick && "cursor-pointer hover:bg-[var(--muted)] transition-colors",
        className,
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex-shrink-0">{left}</div>
      <div className="flex-1 min-w-0">{content}</div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </Tag>
  );
}
