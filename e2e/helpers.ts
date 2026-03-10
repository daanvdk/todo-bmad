import type { APIRequestContext } from "@playwright/test";

export const API_BASE = "http://localhost/api";

export async function deleteAllTodos(request: APIRequestContext) {
  const res = await request.get(`${API_BASE}/todos`);
  if (!res.ok()) throw new Error(`GET /todos failed: ${res.status()}`);
  const todos = await res.json();
  for (const todo of todos) {
    const del = await request.delete(`${API_BASE}/todos/${todo.id}`);
    if (!del.ok())
      throw new Error(`DELETE /todos/${todo.id} failed: ${del.status()}`);
  }
}

export async function seedTodos(request: APIRequestContext, count: number) {
  for (let i = 1; i <= count; i++) {
    const res = await request.post(`${API_BASE}/todos`, {
      data: { text: `Performance test todo ${i}` },
    });
    if (!res.ok())
      throw new Error(`POST /todos failed on item ${i}: ${res.status()}`);
  }
}

export async function createTodo(
  request: APIRequestContext,
  text: string,
  isCompleted = false,
) {
  const res = await request.post(`${API_BASE}/todos`, {
    data: { text },
  });
  if (!res.ok()) throw new Error(`POST /todos failed: ${res.status()}`);
  const todo = await res.json();
  if (isCompleted) {
    const patch = await request.patch(`${API_BASE}/todos/${todo.id}`, {
      data: { is_completed: true },
    });
    if (!patch.ok())
      throw new Error(`PATCH /todos/${todo.id} failed: ${patch.status()}`);
  }
  return todo;
}
