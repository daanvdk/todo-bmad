import { expect, test } from "@playwright/test";
import { deleteAllTodos } from "../helpers";

test.beforeEach(async ({ request }) => {
  await deleteAllTodos(request);
});

test("toggle: marking a todo complete moves it to Completed section and persists after reload", async ({
  page,
}) => {
  await page.goto("/");

  const input = page.getByRole("textbox", { name: "Add a task" });
  await input.fill("Read the docs");
  await input.press("Enter");
  await expect(page.getByText("Read the docs")).toBeVisible();

  await page.getByText("Read the docs").click();

  await expect(page.getByText("Completed")).toBeVisible();
  await expect(page.getByText("Active")).not.toBeVisible();

  await page.reload();
  await expect(page.getByText("Completed")).toBeVisible();
  await expect(page.getByText("Read the docs")).toBeVisible();
});

test("toggle: marking a completed todo active moves it back to Active section", async ({
  page,
}) => {
  await page.goto("/");

  const input = page.getByRole("textbox", { name: "Add a task" });
  await input.fill("Finish report");
  await input.press("Enter");
  await page.getByText("Finish report").click();
  await expect(page.getByText("Completed")).toBeVisible();

  await page.getByText("Finish report").click();
  await expect(page.getByText("Active")).toBeVisible();
  await expect(page.getByText("Completed")).not.toBeVisible();
});

test("delete: deleting the only todo leaves only the input form", async ({
  page,
}) => {
  await page.goto("/");

  const input = page.getByRole("textbox", { name: "Add a task" });
  await input.fill("Temporary task");
  await input.press("Enter");
  await expect(page.getByText("Temporary task")).toBeVisible();

  await page.getByRole("button", { name: "Delete todo", exact: true }).click();

  await expect(page.getByText("Temporary task")).not.toBeVisible();
  await expect(page.getByText("Active")).not.toBeVisible();
  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeVisible();
});
