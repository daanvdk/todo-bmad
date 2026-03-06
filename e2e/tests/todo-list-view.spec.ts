import { type APIRequestContext, expect, test } from "@playwright/test";

const API_BASE = "http://localhost/api";

async function createTodo(
  request: APIRequestContext,
  text: string,
  isCompleted = false,
) {
  const res = await request.post(`${API_BASE}/todos`, {
    data: { text },
  });
  const todo = await res.json();
  if (isCompleted) {
    await request.patch(`${API_BASE}/todos/${todo.id}`, {
      data: { is_completed: true },
    });
  }
  return todo;
}

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

test.afterEach(async ({ request }) => {
  await deleteAllTodos(request);
});

test("empty state: shows only the add-task input, no section labels", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeVisible();
  await expect(page.getByText("Completed")).not.toBeVisible();
  await expect(page.getByText("Active")).not.toBeVisible();
});

test("active todos: renders Active section label and todo text", async ({
  page,
  request,
}) => {
  await createTodo(request, "Buy groceries");
  await createTodo(request, "Walk the dog");

  await page.goto("/");

  await expect(page.getByText("Active")).toBeVisible();
  await expect(page.getByText("Buy groceries")).toBeVisible();
  await expect(page.getByText("Walk the dog")).toBeVisible();
  await expect(page.getByText("Completed")).not.toBeVisible();
});

test("active todo: no strikethrough, unchecked checkbox", async ({
  page,
  request,
}) => {
  await createTodo(request, "Active task");

  await page.goto("/");

  const todoText = page.getByText("Active task");
  await expect(todoText).toBeVisible();
  await expect(todoText).not.toHaveCSS("text-decoration-line", "line-through");

  const checkbox = page.getByRole("checkbox", { name: "Mark as complete" });
  await expect(checkbox).not.toBeChecked();
});

test("completed todo: renders in Completed section with strikethrough and checked checkbox", async ({
  page,
  request,
}) => {
  await createTodo(request, "Finished task", true);

  await page.goto("/");

  await expect(page.getByText("Completed")).toBeVisible();
  const todoText = page.getByText("Finished task");
  await expect(todoText).toBeVisible();
  await expect(todoText).toHaveCSS("text-decoration-line", "line-through");

  const checkbox = page.getByRole("checkbox", { name: "Mark as active" });
  await expect(checkbox).toBeChecked();
});

test("mixed todos: completed section appears above active section", async ({
  page,
  request,
}) => {
  await createTodo(request, "Done item", true);
  await createTodo(request, "Pending item");

  await page.goto("/");

  await expect(page.getByText("Completed")).toBeVisible();
  await expect(page.getByText("Active")).toBeVisible();
  await expect(page.getByText("Done item")).toBeVisible();
  await expect(page.getByText("Pending item")).toBeVisible();

  const completedLabel = page.getByText("Completed");
  const activeLabel = page.getByText("Active");
  const completedY = (await completedLabel.boundingBox())?.y ?? 0;
  const activeY = (await activeLabel.boundingBox())?.y ?? 0;
  expect(completedY).toBeLessThan(activeY);
});

test("all completed: no Active section label, only input row in active area", async ({
  page,
  request,
}) => {
  await createTodo(request, "All done", true);

  await page.goto("/");

  await expect(page.getByText("Completed")).toBeVisible();
  await expect(page.getByText("Active")).not.toBeVisible();
  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeVisible();
});

test("timestamp: each todo shows a <time> element with dateTime attribute", async ({
  page,
  request,
}) => {
  await createTodo(request, "Timestamped task");

  await page.goto("/");

  const timeEl = page.locator("time").first();
  await expect(timeEl).toBeVisible();
  const dateTime = await timeEl.getAttribute("dateTime");
  expect(dateTime).toBeTruthy();
  expect(new Date(dateTime ?? "").toString()).not.toBe("Invalid Date");
});

test("page reload: todos persist in correct state", async ({
  page,
  request,
}) => {
  await createTodo(request, "Persist active");
  await createTodo(request, "Persist done", true);

  await page.goto("/");
  await expect(page.getByText("Persist active")).toBeVisible();
  await expect(page.getByText("Persist done")).toBeVisible();

  await page.reload();

  await expect(page.getByText("Persist active")).toBeVisible();
  await expect(page.getByText("Persist done")).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
});

test("header: My Tasks title is visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "My Tasks" })).toBeVisible();
});

test("header: theme toggle button is present", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", {
    name: /Switch to (dark|light) mode/,
  });
  await expect(toggle).toBeVisible();
});
