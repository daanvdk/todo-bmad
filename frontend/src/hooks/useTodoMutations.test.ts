import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getListTodosQueryKey,
  useCreateTodo,
  useDeleteTodo,
  useUpdateTodo,
} from "@/api/generated/todos/todos";
import { useTodoMutations } from "./useTodoMutations";

vi.mock("@/api/generated/todos/todos", () => ({
  useCreateTodo: vi.fn(),
  useUpdateTodo: vi.fn(),
  useDeleteTodo: vi.fn(),
  getListTodosQueryKey: vi.fn(() => ["/api/todos"]),
}));

const QUERY_KEY = ["/api/todos"];

function makeWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function makeHookSetup() {
  const createMutate = vi.fn();
  const updateMutate = vi.fn();
  const deleteMutate = vi.fn();

  vi.mocked(useCreateTodo).mockReturnValue({
    mutate: createMutate,
  } as unknown as ReturnType<typeof useCreateTodo>);
  vi.mocked(useUpdateTodo).mockReturnValue({
    mutate: updateMutate,
  } as unknown as ReturnType<typeof useUpdateTodo>);
  vi.mocked(useDeleteTodo).mockReturnValue({
    mutate: deleteMutate,
  } as unknown as ReturnType<typeof useDeleteTodo>);

  return { createMutate, updateMutate, deleteMutate };
}

type MutationOptions = Record<string, (...args: unknown[]) => unknown>;

function captureOptions(
  queryClient: QueryClient,
  setError: (msg: string | null) => void,
) {
  let createMutation: MutationOptions = {};
  let updateMutation: MutationOptions = {};
  let deleteMutation: MutationOptions = {};

  vi.mocked(useCreateTodo).mockImplementation((opts: unknown) => {
    createMutation = (opts as { mutation: MutationOptions }).mutation;
    return { mutate: vi.fn() } as unknown as ReturnType<typeof useCreateTodo>;
  });
  vi.mocked(useUpdateTodo).mockImplementation((opts: unknown) => {
    updateMutation = (opts as { mutation: MutationOptions }).mutation;
    return { mutate: vi.fn() } as unknown as ReturnType<typeof useUpdateTodo>;
  });
  vi.mocked(useDeleteTodo).mockImplementation((opts: unknown) => {
    deleteMutation = (opts as { mutation: MutationOptions }).mutation;
    return { mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteTodo>;
  });

  renderHook(() => useTodoMutations(setError), {
    wrapper: makeWrapper(queryClient),
  });

  return { createMutation, updateMutation, deleteMutation };
}

describe("useTodoMutations", () => {
  let queryClient: QueryClient;
  let setError: (msg: string | null) => void;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    setError = vi.fn<(msg: string | null) => void>();
    vi.mocked(getListTodosQueryKey).mockReturnValue(QUERY_KEY as never);
  });

  describe("handleCreate", () => {
    it("calls createTodo mutate with text wrapped in data object", () => {
      const { createMutate } = makeHookSetup();
      const { result } = renderHook(() => useTodoMutations(setError), {
        wrapper: makeWrapper(queryClient),
      });

      act(() => {
        result.current.handleCreate("buy milk");
      });

      expect(createMutate).toHaveBeenCalledWith({ data: { text: "buy milk" } });
    });
  });

  describe("handleDelete", () => {
    it("calls deleteTodo mutate with todoId", () => {
      const { deleteMutate } = makeHookSetup();
      const { result } = renderHook(() => useTodoMutations(setError), {
        wrapper: makeWrapper(queryClient),
      });

      act(() => {
        result.current.handleDelete(42);
      });

      expect(deleteMutate).toHaveBeenCalledWith({ todoId: 42 });
    });
  });

  describe("handleToggle", () => {
    it("calls updateTodo with toggled is_completed when todo exists in cache", () => {
      const { updateMutate } = makeHookSetup();
      queryClient.setQueryData(QUERY_KEY, {
        data: [
          {
            id: 1,
            text: "test",
            is_completed: false,
            created_at: "2024-01-01",
          },
        ],
      });

      const { result } = renderHook(() => useTodoMutations(setError), {
        wrapper: makeWrapper(queryClient),
      });

      act(() => {
        result.current.handleToggle(1);
      });

      expect(updateMutate).toHaveBeenCalledWith({
        todoId: 1,
        data: { is_completed: true },
      });
    });

    it("toggles is_completed from true to false", () => {
      const { updateMutate } = makeHookSetup();
      queryClient.setQueryData(QUERY_KEY, {
        data: [
          { id: 5, text: "done", is_completed: true, created_at: "2024-01-01" },
        ],
      });

      const { result } = renderHook(() => useTodoMutations(setError), {
        wrapper: makeWrapper(queryClient),
      });

      act(() => {
        result.current.handleToggle(5);
      });

      expect(updateMutate).toHaveBeenCalledWith({
        todoId: 5,
        data: { is_completed: false },
      });
    });

    it("does nothing when todo is not found in cache", () => {
      const { updateMutate } = makeHookSetup();
      queryClient.setQueryData(QUERY_KEY, { data: [] });

      const { result } = renderHook(() => useTodoMutations(setError), {
        wrapper: makeWrapper(queryClient),
      });

      act(() => {
        result.current.handleToggle(99);
      });

      expect(updateMutate).not.toHaveBeenCalled();
    });

    it("does nothing when cache is empty", () => {
      const { updateMutate } = makeHookSetup();

      const { result } = renderHook(() => useTodoMutations(setError), {
        wrapper: makeWrapper(queryClient),
      });

      act(() => {
        result.current.handleToggle(1);
      });

      expect(updateMutate).not.toHaveBeenCalled();
    });
  });

  describe("mutation error callbacks", () => {
    it("create error calls setError with 'Failed to save'", () => {
      const { createMutation } = captureOptions(queryClient, setError);
      createMutation.onError(new Error(), {}, undefined);
      expect(setError).toHaveBeenCalledWith("Failed to save");
    });

    it("update error calls setError with 'Failed to save'", () => {
      const { updateMutation } = captureOptions(queryClient, setError);
      updateMutation.onError(new Error(), {}, undefined);
      expect(setError).toHaveBeenCalledWith("Failed to save");
    });

    it("delete error calls setError with 'Failed to delete'", () => {
      const { deleteMutation } = captureOptions(queryClient, setError);
      deleteMutation.onError(new Error(), {}, undefined);
      expect(setError).toHaveBeenCalledWith("Failed to delete");
    });
  });

  describe("optimistic updaters", () => {
    it("createTodo optimistic updater appends a new temp item", async () => {
      const { createMutation } = captureOptions(queryClient, setError);
      queryClient.setQueryData(QUERY_KEY, {
        data: [
          {
            id: 1,
            text: "existing",
            is_completed: false,
            created_at: "2024-01-01",
          },
        ],
      });

      await createMutation.onMutate({ data: { text: "new task" } });

      const cached = queryClient.getQueryData<{
        data: { id: number; text: string; is_completed: boolean }[];
      }>(QUERY_KEY);
      expect(cached?.data).toHaveLength(2);
      expect(cached?.data[1].text).toBe("new task");
      expect(cached?.data[1].is_completed).toBe(false);
      expect(cached?.data[1].id).toBeLessThan(0); // temp negative ID
    });

    it("updateTodo optimistic updater marks the matching todo as completed", async () => {
      const { updateMutation } = captureOptions(queryClient, setError);
      queryClient.setQueryData(QUERY_KEY, {
        data: [
          { id: 1, text: "a", is_completed: false, created_at: "2024-01-01" },
          { id: 2, text: "b", is_completed: false, created_at: "2024-01-01" },
        ],
      });

      await updateMutation.onMutate({
        todoId: 1,
        data: { is_completed: true },
      });

      const cached = queryClient.getQueryData<{
        data: { id: number; is_completed: boolean }[];
      }>(QUERY_KEY);
      expect(cached?.data[0].is_completed).toBe(true);
      expect(cached?.data[1].is_completed).toBe(false);
    });

    it("deleteTodo optimistic updater removes the matching todo", async () => {
      const { deleteMutation } = captureOptions(queryClient, setError);
      queryClient.setQueryData(QUERY_KEY, {
        data: [
          { id: 1, text: "a", is_completed: false, created_at: "2024-01-01" },
          { id: 2, text: "b", is_completed: false, created_at: "2024-01-01" },
        ],
      });

      await deleteMutation.onMutate({ todoId: 1 });

      const cached = queryClient.getQueryData<{ data: { id: number }[] }>(
        QUERY_KEY,
      );
      expect(cached?.data).toHaveLength(1);
      expect(cached?.data[0].id).toBe(2);
    });
  });
});
