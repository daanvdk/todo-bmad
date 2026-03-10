import { expect, test } from "@playwright/test";
import { createTodo, deleteAllTodos } from "../helpers";

test.beforeEach(async ({ request }) => {
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

test("todo list: active and completed todos appear in correct sections", async ({
  page,
  request,
}) => {
  await createTodo(request, "Pending item");
  await createTodo(request, "Done item", true);

  await page.goto("/");

  await expect(page.getByText("Active")).toBeVisible();
  await expect(page.getByText("Pending item")).toBeVisible();
  await expect(page.getByText("Completed")).toBeVisible();
  await expect(page.getByText("Done item")).toBeVisible();
});

test("todo list: completed section appears above active section", async ({
  page,
  request,
}) => {
  await createTodo(request, "Done item", true);
  await createTodo(request, "Pending item");

  await page.goto("/");

  const completedY = (await page.getByText("Completed").boundingBox())?.y ?? 0;
  const activeY = (await page.getByText("Active").boundingBox())?.y ?? 0;
  expect(completedY).toBeLessThan(activeY);
});

test("todo list: persists correct state after page reload", async ({
  page,
  request,
}) => {
  await createTodo(request, "Persist active");
  await createTodo(request, "Persist done", true);

  await page.goto("/");
  await page.reload();

  await expect(page.getByText("Persist active")).toBeVisible();
  await expect(page.getByText("Persist done")).toBeVisible();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
});
