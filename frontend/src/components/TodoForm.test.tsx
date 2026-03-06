import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TodoForm } from "./TodoForm";

describe("TodoForm", () => {
  it("renders input with aria-label 'Add a task'", () => {
    render(<TodoForm />);
    expect(
      screen.getByRole("textbox", { name: "Add a task" }),
    ).toBeInTheDocument();
  });

  it("renders input with placeholder 'Add a task…'", () => {
    render(<TodoForm />);
    expect(screen.getByPlaceholderText("Add a task…")).toBeInTheDocument();
  });
});
