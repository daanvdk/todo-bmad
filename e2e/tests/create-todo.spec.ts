import { type APIRequestContext, expect, test } from "@playwright/test";

const API_BASE = "http://localhost/api";

async function deleteAllTodos(request: APIRequestContext) {
  const res = await request.get(`${API_BASE}/todos`);
  const todos = await res.json();
  for (const todo of todos) {
    await request.delete(`${API_BASE}/todos/${todo.id}`);
  }
}

test.beforeEach(async ({ request }) => {
  await deleteAllTodos(request);
});

test("create todo: type a task, submit, see it appear, persists after reload", async ({
  page,
}) => {
  await page.goto("/");

  const input = page.getByRole("textbox", { name: "Add a task" });
  await input.fill("Buy groceries");
  await input.press("Enter");

  await expect(page.getByText("Buy groceries")).toBeVisible();
  await expect(page.getByText("Active")).toBeVisible();
  await expect(input).toHaveValue("");

  await page.reload();

  await expect(page.getByText("Buy groceries")).toBeVisible();
  await expect(page.getByText("Active")).toBeVisible();
});
