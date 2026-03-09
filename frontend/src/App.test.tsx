import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

function newQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithClient(
  ui: React.ReactElement,
  queryClient = newQueryClient(),
) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

vi.mock("@/api/generated/todos/todos", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/api/generated/todos/todos")>();
  return {
    ...actual,
    useListTodos: vi.fn(),
    useCreateTodo: vi.fn(() => ({ mutate: vi.fn() })),
    useUpdateTodo: vi.fn(() => ({ mutate: vi.fn() })),
    useDeleteTodo: vi.fn(() => ({ mutate: vi.fn() })),
  };
});

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

const {
  useListTodos,
  useCreateTodo,
  useUpdateTodo,
  useDeleteTodo,
  getListTodosQueryKey,
} = await import("@/api/generated/todos/todos");
const mockUseListTodos = vi.mocked(useListTodos);
const mockUseCreateTodo = vi.mocked(useCreateTodo);
const mockUseUpdateTodo = vi.mocked(useUpdateTodo);
const mockUseDeleteTodo = vi.mocked(useDeleteTodo);

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
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

  it("calls updateTodo mutate when active todo row is clicked", async () => {
    const mockMutate = vi.fn();
    mockUseUpdateTodo.mockReturnValue({
      mutate: mockMutate,
    } as unknown as ReturnType<typeof useUpdateTodo>);
    const todo = {
      id: 10,
      text: "Active item",
      is_completed: false,
      created_at: "2026-03-06T10:00:00",
    };
    mockUseListTodos.mockReturnValue({
      data: { data: [todo] },
      isError: false,
    } as ReturnType<typeof useListTodos>);
    const queryClient = newQueryClient();
    queryClient.setQueryData(getListTodosQueryKey(), { data: [todo] });
    renderWithClient(<App />, queryClient);
    await userEvent.click(screen.getByText("Active item"));
    expect(mockMutate).toHaveBeenCalledWith({
      todoId: 10,
      data: { is_completed: true },
    });
  });

  it("calls updateTodo mutate with is_completed: false when completed todo row is clicked", async () => {
    const mockMutate = vi.fn();
    mockUseUpdateTodo.mockReturnValue({
      mutate: mockMutate,
    } as unknown as ReturnType<typeof useUpdateTodo>);
    const todo = {
      id: 11,
      text: "Done item",
      is_completed: true,
      created_at: "2026-03-06T10:00:00",
    };
    mockUseListTodos.mockReturnValue({
      data: { data: [todo] },
      isError: false,
    } as ReturnType<typeof useListTodos>);
    const queryClient = newQueryClient();
    queryClient.setQueryData(getListTodosQueryKey(), { data: [todo] });
    renderWithClient(<App />, queryClient);
    await userEvent.click(screen.getByText("Done item"));
    expect(mockMutate).toHaveBeenCalledWith({
      todoId: 11,
      data: { is_completed: false },
    });
  });

  it("calls deleteTodoMutation mutate when trash icon is clicked", async () => {
    const mockMutate = vi.fn();
    mockUseDeleteTodo.mockReturnValue({
      mutate: mockMutate,
    } as unknown as ReturnType<typeof useDeleteTodo>);
    mockUseListTodos.mockReturnValue({
      data: {
        data: [
          {
            id: 12,
            text: "Delete me",
            is_completed: false,
            created_at: "2026-03-06T10:00:00",
          },
        ],
      },
      isError: false,
    } as ReturnType<typeof useListTodos>);
    renderWithClient(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Delete todo" }));
    expect(mockMutate).toHaveBeenCalledWith({ todoId: 12 });
  });

  it("shows mutation error in banner when create fails", () => {
    mockUseListTodos.mockReturnValue({
      data: { data: [] },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useListTodos>);
    // Capture the onError callback from mutation options, then invoke it once
    let capturedOnError: ((...args: unknown[]) => void) | undefined;
    mockUseCreateTodo.mockImplementation(((options?: {
      mutation?: { onError?: (...args: unknown[]) => void };
    }) => {
      if (options?.mutation?.onError && !capturedOnError) {
        capturedOnError = options.mutation.onError;
      }
      return { mutate: vi.fn() } as unknown as ReturnType<typeof useCreateTodo>;
    }) as typeof useCreateTodo);
    renderWithClient(<App />);
    // Invoke onError after render to simulate mutation failure
    act(() => {
      capturedOnError?.(
        new Error("server error"),
        { data: { text: "test" } },
        undefined,
      );
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to save");
  });

  it("shows skeleton rows and form when loading", () => {
    mockUseListTodos.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    } as ReturnType<typeof useListTodos>);
    const { container } = renderWithClient(<App />);
    expect(
      screen.getByRole("textbox", { name: "Add a task" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    // Verify skeleton rows are actually rendered (li elements from SkeletonRow)
    const skeletons = container.querySelectorAll('li[aria-hidden="true"]');
    expect(skeletons).toHaveLength(3);
  });

  it("shows 'Network issue' error banner when fetch fails", () => {
    mockUseListTodos.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    } as ReturnType<typeof useListTodos>);
    renderWithClient(<App />);
    expect(screen.getByRole("alert")).toHaveTextContent("Network issue");
    expect(
      screen.getByRole("textbox", { name: "Add a task" }),
    ).toBeInTheDocument();
  });

  it("clears error banner when fetch error resolves with fresh data", async () => {
    // Start with a fetch error
    mockUseListTodos.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    } as ReturnType<typeof useListTodos>);

    const queryClient = newQueryClient();
    const { rerender } = renderWithClient(<App />, queryClient);

    expect(screen.getByRole("alert")).toHaveTextContent("Network issue");

    // Fetch error resolves — fresh data arrives
    mockUseListTodos.mockReturnValue({
      data: { data: [] },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useListTodos>);

    rerender(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
