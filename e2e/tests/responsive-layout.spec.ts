import {
  type APIRequestContext,
  expect,
  type Locator,
  test,
} from "@playwright/test";

const API_BASE = "http://localhost/api";

async function getBounds(locator: Locator) {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error("Element has no bounding box");
  return bounds;
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

test("no horizontal scroll at 375px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeVisible();
  const hasHorizontalScroll = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll).toBe(false);
});

test("no horizontal scroll at 375px with todos present", async ({
  page,
  request,
}) => {
  await request.post(`${API_BASE}/todos`, {
    data: {
      text: "This is a very long task description that might cause overflow on mobile devices",
    },
  });

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  await expect(page.getByText("This is a very long")).toBeVisible();

  const hasHorizontalScroll = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll).toBe(false);
});

test("all interactive elements visible and enabled at 375px", async ({
  page,
  request,
}) => {
  await request.post(`${API_BASE}/todos`, {
    data: { text: "Mobile test todo" },
  });

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  await expect(page.getByRole("button", { name: /switch to/i })).toBeVisible();
  await expect(page.getByRole("checkbox")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete todo", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeEnabled();
});

test("layout is single centered column at 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeVisible();

  const hasHorizontalScroll = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll).toBe(false);

  const mainWidth = await page
    .locator("main")
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(mainWidth).toBeLessThanOrEqual(672);
});

test("no horizontal scroll at 768px tablet viewport", async ({
  page,
  request,
}) => {
  await request.post(`${API_BASE}/todos`, {
    data: { text: "Tablet viewport test todo" },
  });

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");

  await expect(page.getByText("Tablet viewport test todo")).toBeVisible();

  const hasHorizontalScroll = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll).toBe(false);
});

test("interactive elements meet 44px minimum touch target (WCAG 2.5.5)", async ({
  page,
  request,
}) => {
  await request.post(`${API_BASE}/todos`, {
    data: { text: "Touch target test" },
  });

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  await expect(page.getByText("Touch target test")).toBeVisible();

  // Theme toggle button
  const toggleBounds = await getBounds(
    page.getByRole("button", { name: /switch to/i }),
  );
  expect(toggleBounds.width).toBeGreaterThanOrEqual(44);
  expect(toggleBounds.height).toBeGreaterThanOrEqual(44);

  // Delete button
  const deleteBounds = await getBounds(
    page.getByRole("button", { name: "Delete todo", exact: true }),
  );
  expect(deleteBounds.width).toBeGreaterThanOrEqual(44);
  expect(deleteBounds.height).toBeGreaterThanOrEqual(44);

  // Add button
  const addBounds = await getBounds(
    page.getByRole("button", { name: "Add todo" }),
  );
  expect(addBounds.width).toBeGreaterThanOrEqual(44);
  expect(addBounds.height).toBeGreaterThanOrEqual(44);

  // Checkbox — visual element is 16px but a CSS pseudo-element extends
  // the clickable area to 44px.  Verify by clicking 12px above the
  // checkbox center (within the 14px pseudo-element extension).
  const checkbox = page.getByRole("checkbox");
  const cBox = await getBounds(checkbox);
  await page.mouse.click(cBox.x + cBox.width / 2, cBox.y - 12);
  await expect(checkbox).toBeChecked();
});

test("checkbox and trash icon are on opposite sides of todo row", async ({
  page,
  request,
}) => {
  await request.post(`${API_BASE}/todos`, {
    data: { text: "Layout test todo" },
  });

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  await expect(page.getByText("Layout test todo")).toBeVisible();

  const checkboxBounds = await getBounds(page.getByRole("checkbox"));
  const deleteBounds = await getBounds(
    page.getByRole("button", { name: "Delete todo", exact: true }),
  );

  // Checkbox should be to the left of the delete button
  expect(checkboxBounds.x).toBeLessThan(deleteBounds.x);
});
