import { expect, test } from "@playwright/test";
import { deleteAllTodos } from "../helpers";

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
