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

test("shows skeleton rows during loading and form is immediately usable", async ({
  page,
}) => {
  // Delay the /api/todos response to observe loading state
  await page.route("/api/todos", async (route) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });

  await page.goto("/");

  // Skeleton rows are visible during loading
  const skeletons = page.locator('li[aria-hidden="true"]');
  await expect(skeletons).toHaveCount(3);

  // Form is immediately usable (doesn't wait for list)
  const input = page.getByRole("textbox", { name: "Add a task" });
  await expect(input).toBeVisible();
  await expect(input).toBeEnabled();

  // After data loads, skeletons are replaced by real content
  await expect(skeletons).toHaveCount(0);
  await expect(input).toBeVisible();
});

test("shows error banner when GET /todos fails and form stays usable", async ({
  page,
}) => {
  // Abort the todos fetch entirely
  await page.route("/api/todos", (route) => route.abort());

  await page.goto("/");

  // Error banner should appear (TanStack Query retries 3 times before showing error)
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("alert")).toContainText(/network issue/i);

  // Form is still usable despite the error
  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeEnabled();
});
