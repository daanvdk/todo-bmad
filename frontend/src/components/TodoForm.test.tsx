import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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

  it("input has autoFocus attribute", () => {
    render(<TodoForm />);
    expect(screen.getByRole("textbox", { name: "Add a task" })).toHaveFocus();
  });

  it("calls onCreate with trimmed text on Enter", async () => {
    const onCreate = vi.fn();
    render(<TodoForm onCreate={onCreate} />);
    const input = screen.getByRole("textbox", { name: "Add a task" });
    await userEvent.type(input, "Buy milk");
    await userEvent.keyboard("{Enter}");
    expect(onCreate).toHaveBeenCalledWith("Buy milk");
  });

  it("clears input after submission", async () => {
    const onCreate = vi.fn();
    render(<TodoForm onCreate={onCreate} />);
    await userEvent.type(
      screen.getByRole("textbox", { name: "Add a task" }),
      "Buy milk",
    );
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("textbox", { name: "Add a task" })).toHaveValue("");
  });

  it("does not call onCreate when input is empty", async () => {
    const onCreate = vi.fn();
    render(<TodoForm onCreate={onCreate} />);
    await userEvent.keyboard("{Enter}");
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("does not call onCreate for whitespace-only input", async () => {
    const onCreate = vi.fn();
    render(<TodoForm onCreate={onCreate} />);
    await userEvent.type(
      screen.getByRole("textbox", { name: "Add a task" }),
      "   ",
    );
    await userEvent.keyboard("{Enter}");
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("add button is disabled when input is empty", () => {
    render(<TodoForm onCreate={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Add todo" })).toBeDisabled();
  });

  it("add button is enabled when input has text", async () => {
    render(<TodoForm onCreate={vi.fn()} />);
    await userEvent.type(
      screen.getByRole("textbox", { name: "Add a task" }),
      "Buy milk",
    );
    expect(screen.getByRole("button", { name: "Add todo" })).toBeEnabled();
  });

  it("input retains focus after submission", async () => {
    const onCreate = vi.fn();
    render(<TodoForm onCreate={onCreate} />);
    const input = screen.getByRole("textbox", { name: "Add a task" });
    await userEvent.type(input, "Buy milk");
    await userEvent.keyboard("{Enter}");
    expect(input).toHaveFocus();
  });

  it("clicking add button calls onCreate", async () => {
    const onCreate = vi.fn();
    render(<TodoForm onCreate={onCreate} />);
    await userEvent.type(
      screen.getByRole("textbox", { name: "Add a task" }),
      "Buy milk",
    );
    await userEvent.click(screen.getByRole("button", { name: "Add todo" }));
    expect(onCreate).toHaveBeenCalledWith("Buy milk");
  });
});
