import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

vi.mock("@/api/generated/todos/todos", () => ({
  useListTodos: vi.fn(),
  useCreateTodo: vi.fn(() => ({ mutate: vi.fn() })),
  getListTodosQueryKey: () => ["/todos"],
}));

vi.mock("@/components/ThemeProvider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/ThemeProvider")>();
  return {
    ...actual,
    ThemeProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

vi.mock("@/hooks/useTheme", () => ({
  useTheme: vi.fn(() => ({ theme: "light", toggleTheme: vi.fn() })),
}));

const { useListTodos, useCreateTodo } = await import(
  "@/api/generated/todos/todos"
);
const mockUseListTodos = vi.mocked(useListTodos);
const mockUseCreateTodo = vi.mocked(useCreateTodo);

describe("App", () => {
  it("renders 'My Tasks' header", () => {
    mockUseListTodos.mockReturnValue({
      data: { data: [] },
      isError: false,
    } as ReturnType<typeof useListTodos>);
    renderWithClient(<App />);
    expect(screen.getByText("My Tasks")).toBeInTheDocument();
  });

  it("shows only input row when no todos (empty state)", () => {
    mockUseListTodos.mockReturnValue({
      data: { data: [] },
      isError: false,
    } as ReturnType<typeof useListTodos>);
    renderWithClient(<App />);
    expect(
      screen.getByRole("textbox", { name: "Add a task" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("renders completed section when completed todos exist", () => {
    mockUseListTodos.mockReturnValue({
      data: {
        data: [
          {
            id: 1,
            text: "Done item",
            is_completed: true,
            created_at: "2026-03-06T10:00:00",
          },
        ],
      },
      isError: false,
    } as ReturnType<typeof useListTodos>);
    renderWithClient(<App />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Done item")).toBeInTheDocument();
  });

  it("renders active section when active todos exist", () => {
    mockUseListTodos.mockReturnValue({
      data: {
        data: [
          {
            id: 2,
            text: "Active item",
            is_completed: false,
            created_at: "2026-03-06T10:00:00",
          },
        ],
      },
      isError: false,
    } as ReturnType<typeof useListTodos>);
    renderWithClient(<App />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Active item")).toBeInTheDocument();
  });

  it("does not render Completed section when no completed todos", () => {
    mockUseListTodos.mockReturnValue({
      data: {
        data: [
          {
            id: 3,
            text: "Only active",
            is_completed: false,
            created_at: "2026-03-06T10:00:00",
          },
        ],
      },
      isError: false,
    } as ReturnType<typeof useListTodos>);
    renderWithClient(<App />);
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
  });

  it("does not render Active section label when all todos are completed (AC7)", () => {
    mockUseListTodos.mockReturnValue({
      data: {
        data: [
          {
            id: 4,
            text: "All done",
            is_completed: true,
            created_at: "2026-03-06T10:00:00",
          },
        ],
      },
      isError: false,
    } as ReturnType<typeof useListTodos>);
    renderWithClient(<App />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Add a task" }),
    ).toBeInTheDocument();
  });

  it("calls createTodo mutate when form is submitted", async () => {
    const mockMutate = vi.fn();
    mockUseCreateTodo.mockReturnValue({
      mutate: mockMutate,
    } as unknown as ReturnType<typeof useCreateTodo>);
    mockUseListTodos.mockReturnValue({
      data: { data: [] },
      isError: false,
    } as ReturnType<typeof useListTodos>);
    renderWithClient(<App />);
    const input = screen.getByRole("textbox", { name: "Add a task" });
    await userEvent.type(input, "Buy milk");
    await userEvent.keyboard("{Enter}");
    expect(mockMutate).toHaveBeenCalledWith({ data: { text: "Buy milk" } });
  });
});
