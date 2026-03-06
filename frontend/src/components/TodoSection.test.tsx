import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TodoPublic } from "@/api/generated/todoBmadAPI.schemas";
import { TodoSection } from "./TodoSection";

const todos: TodoPublic[] = [
  {
    id: 1,
    text: "Task one",
    is_completed: false,
    created_at: "2026-03-06T10:00:00",
  },
  {
    id: 2,
    text: "Task two",
    is_completed: false,
    created_at: "2026-03-06T11:00:00",
  },
];

describe("TodoSection", () => {
  it("renders section label when items exist", () => {
    render(<TodoSection label="Active" todos={todos} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("does not render section label when no items", () => {
    render(<TodoSection label="Completed" todos={[]} />);
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
  });

  it("does not render section at all when no items", () => {
    const { container } = render(<TodoSection label="Completed" todos={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders all todo items", () => {
    render(<TodoSection label="Active" todos={todos} />);
    expect(screen.getByText("Task one")).toBeInTheDocument();
    expect(screen.getByText("Task two")).toBeInTheDocument();
  });
});
