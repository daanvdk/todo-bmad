import { expect, test } from "@playwright/test";
import { API_BASE, deleteAllTodos, seedTodos } from "../helpers";

test.describe("Performance Benchmarks", () => {
  test.slow();

  test.beforeEach(async ({ request }) => {
    await deleteAllTodos(request);
    await seedTodos(request, 20);
  });

  test("NFR-02: initial render with 20 todos completes in ≤1000ms", async ({
    page,
  }) => {
    const start = Date.now();
    await page.goto("/");
    await expect(
      page.getByText("Performance test todo 1", { exact: true }),
    ).toBeVisible();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });

  test("NFR-01: optimistic create appears in ≤200ms despite 2s server delay", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByText("Performance test todo 1", { exact: true }),
    ).toBeVisible();

    // Intercept POST /todos and delay server response by 2000ms to prove optimistic behaviour
    await page.route("**/api/todos", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      } else {
        await route.continue();
      }
    });

    const input = page.getByRole("textbox", { name: "Add a task" });
    await input.fill("Perf test task");

    const start = Date.now();
    await input.press("Enter");
    await expect(page.getByText("Perf test task")).toBeVisible({
      timeout: 1000,
    });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(200);

    await page.unroute("**/api/todos");
  });

  test("NFR-03: API p95 response time for GET /todos is ≤500ms", async ({
    request,
  }) => {
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = Date.now();
      await request.get(`${API_BASE}/todos`);
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.ceil(times.length * 0.95) - 1];

    expect(p95).toBeLessThan(500);
  });
});
