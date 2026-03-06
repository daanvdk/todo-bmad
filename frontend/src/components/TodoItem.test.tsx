import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TodoPublic } from "@/api/generated/todoBmadAPI.schemas";
import { TodoItem } from "./TodoItem";

const activeTodo: TodoPublic = {
  id: 1,
  text: "Buy groceries",
  is_completed: false,
  created_at: "2026-03-06T10:30:00",
};

const completedTodo: TodoPublic = {
  id: 2,
  text: "Read a book",
  is_completed: true,
  created_at: "2026-03-05T08:00:00",
};

describe("TodoItem", () => {
  it("renders todo text", () => {
    render(
      <ul>
        <TodoItem todo={activeTodo} />
      </ul>,
    );
    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
  });

  it("renders without strikethrough for active todo", () => {
    render(
      <ul>
        <TodoItem todo={activeTodo} />
      </ul>,
    );
    const text = screen.getByText("Buy groceries");
    expect(text.className).not.toContain("line-through");
  });

  it("renders with strikethrough for completed todo", () => {
    render(
      <ul>
        <TodoItem todo={completedTodo} />
      </ul>,
    );
    const text = screen.getByText("Read a book");
    expect(text.className).toContain("line-through");
  });

  it("renders timestamp in <time> element with dateTime attribute", () => {
    render(
      <ul>
        <TodoItem todo={activeTodo} />
      </ul>,
    );
    const timeEl = screen.getByRole("time") as HTMLTimeElement;
    expect(timeEl).toBeInTheDocument();
    expect(timeEl.dateTime).toBe("2026-03-06T10:30:00");
  });

  it("renders checkbox as unchecked for active todo", () => {
    render(
      <ul>
        <TodoItem todo={activeTodo} />
      </ul>,
    );
    const checkbox = screen.getByRole("checkbox", { name: "Mark as complete" });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it("renders checkbox as checked for completed todo", () => {
    render(
      <ul>
        <TodoItem todo={completedTodo} />
      </ul>,
    );
    const checkbox = screen.getByRole("checkbox", { name: "Mark as active" });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });
});
