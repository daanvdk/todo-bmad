import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Result } from "axe-core";
import { createTodo, deleteAllTodos } from "../helpers";

function assertNoViolations(violations: Result[]): void {
  if (violations.length > 0) {
    const formatted = violations
      .map(
        (v) =>
          `[${v.impact ?? "unknown"}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map((n) => n.html).join(", ")}`,
      )
      .join("\n");
    throw new Error(`Accessibility violations:\n${formatted}`);
  }
}

test.describe("WCAG AA Accessibility Scans", () => {
  test.beforeEach(async ({ request }) => {
    await deleteAllTodos(request);
  });

  test("loaded list state has no WCAG AA violations", async ({
    page,
    request,
  }) => {
    await createTodo(request, "Accessibility test todo");
    await page.goto("/");
    await expect(page.getByText("Accessibility test todo")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    assertNoViolations(results.violations);
  });

  test("empty state has no WCAG AA violations", async ({ page }) => {
    await page.goto("/");
    // Wait for loading to complete: skeleton rows disappear once data loads
    await expect(page.locator('li[aria-hidden="true"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    assertNoViolations(results.violations);
  });

  test("loading skeleton state has no WCAG AA violations", async ({ page }) => {
    await page.route("**/api/todos", async (route) => {
      if (route.request().method() === "GET") {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await route.continue();
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    // Wait for skeleton elements to actually render before scanning
    await expect(page.locator('li[aria-hidden="true"]').first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    await page.unroute("**/api/todos");

    assertNoViolations(results.violations);
  });

  test("error banner state has no WCAG AA violations", async ({ page }) => {
    // Abort the fetch so TanStack Query retries 3x then shows the error banner
    await page.route("**/api/todos", (route) => {
      if (route.request().method() === "GET") {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto("/");
    // TanStack Query retries 3 times before surfacing the error — allow up to 15s
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15000 });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    await page.unroute("**/api/todos");

    assertNoViolations(results.violations);
  });

  test("dark mode state has no WCAG AA violations", async ({
    page,
    request,
  }) => {
    await createTodo(request, "Dark mode a11y test");
    // Set dark theme in localStorage before reload so ThemeProvider applies it
    // on initial render (avoids transition timing issues with dynamic toggle)
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByText("Dark mode a11y test")).toBeVisible();
    // Force a reflow so all CSS cascade computations are resolved before axe runs
    await page.evaluate(() => document.body.getBoundingClientRect());

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    assertNoViolations(results.violations);
  });
});
