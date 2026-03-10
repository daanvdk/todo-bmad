import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import type {
  TodoCreate,
  TodoPublic,
  TodoUpdate,
} from "@/api/generated/todoBmadAPI.schemas";
import {
  getListTodosQueryKey,
  useCreateTodo,
  useDeleteTodo,
  useUpdateTodo,
} from "@/api/generated/todos/todos";
import { makeOptimisticHandlers } from "@/lib/optimisticMutation";

export function useTodoMutations(setError: (msg: string | null) => void) {
  const queryClient = useQueryClient();
  const nextTempId = useRef(-1);

  const { mutate: createTodo } = useCreateTodo({
    mutation: makeOptimisticHandlers<TodoPublic, { data: TodoCreate }>(
      queryClient,
      getListTodosQueryKey,
      (items, { data: newTodo }) => [
        ...items,
        {
          id: nextTempId.current--,
          text: newTodo.text,
          is_completed: false,
          created_at: new Date().toISOString(),
        },
      ],
      () => setError("Failed to save"),
    ),
  });

  const { mutate: updateTodo } = useUpdateTodo({
    mutation: makeOptimisticHandlers<
      TodoPublic,
      { todoId: number; data: TodoUpdate }
    >(
      queryClient,
      getListTodosQueryKey,
      (items, { todoId, data }) =>
        items.map((t) =>
          t.id === todoId ? { ...t, is_completed: data.is_completed } : t,
        ),
      () => setError("Failed to save"),
    ),
  });

  const { mutate: deleteTodoMutation } = useDeleteTodo({
    mutation: makeOptimisticHandlers<TodoPublic, { todoId: number }>(
      queryClient,
      getListTodosQueryKey,
      (items, { todoId }) => items.filter((t) => t.id !== todoId),
      () => setError("Failed to delete"),
    ),
  });

  const handleCreate = (text: string) => createTodo({ data: { text } });

  const handleToggle = (id: number) => {
    const todo = queryClient
      .getQueryData<{ data: TodoPublic[] }>(getListTodosQueryKey())
      ?.data.find((t) => t.id === id);
    if (!todo) return;
    updateTodo({
      todoId: id,
      data: { is_completed: !todo.is_completed },
    });
  };

  const handleDelete = (id: number) => deleteTodoMutation({ todoId: id });

  return { handleCreate, handleToggle, handleDelete };
}
