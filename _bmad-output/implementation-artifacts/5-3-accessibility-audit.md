# Story 5.3: Accessibility Audit

Status: done

## Story

As a **user and developer**,
I want automated accessibility checks integrated into the E2E suite and any violations fixed,
so that WCAG 2.1 AA compliance is continuously enforced rather than verified once and forgotten.

## Acceptance Criteria

1. **Given** `@axe-core/playwright` is installed as an E2E dev dependency
   **When** the accessibility test suite runs
   **Then** it scans each major app state: loaded list, empty state, loading skeleton state, error banner visible, dark mode

2. **Given** any WCAG AA violation detected by axe
   **When** the test runs
   **Then** the test fails with a report of the specific violation, its impact level, and the affected element

3. **Given** a Lighthouse audit run against `http://localhost` (full Docker stack)
   **When** the accessibility category is measured
   **Then** the score is ≥90

4. **Given** any violations found during initial audit runs
   **Then** they are fixed before the story is marked complete
   **And** the final Lighthouse accessibility score (≥90) is documented in the story's change log

5. **Given** the axe tests
   **Then** they live in `e2e/tests/accessibility.spec.ts` and run as part of the standard E2E suite in CI

## Tasks / Subtasks

- [x] Install `@axe-core/playwright` as E2E dev dependency (AC: #1)
  - [x] `cd e2e && npm install --save-dev @axe-core/playwright`
  - [x] Verify it appears in `e2e/package.json` devDependencies
- [x] Create `e2e/tests/accessibility.spec.ts` with axe scans (AC: #1, #2, #5)
  - [x] Test: loaded list state (seed ≥1 todo, wait for list visible, run axe with WCAG AA tags)
  - [x] Test: empty state (delete all todos, wait for empty state, run axe)
  - [x] Test: loading skeleton state (intercept GET /api/todos to delay 2s, navigate, run axe before todos appear)
  - [x] Test: error banner state (intercept GET /api/todos to return 500, navigate, wait for error banner, run axe)
  - [x] Test: dark mode state (activate dark mode via theme toggle, run axe)
  - [x] Assert `results.violations` is empty for each state (axe reports full violation details on failure)
- [x] Run Lighthouse audit and document result (AC: #3, #4)
  - [x] Run: `npx lighthouse http://localhost --only-categories=accessibility --output=json --output-path=/tmp/lighthouse-a11y.json --chrome-flags="--headless"`
  - [x] Check score ≥90 in output (JSON path: `categories.accessibility.score * 100`)
  - [x] Document the final score in this story's change log
- [x] Fix any axe or Lighthouse violations found (AC: #4)
- [x] Run linter: `cd e2e && npx biome check --write .` (AC: #5)
- [x] Run all three test layers and confirm green (AC: #5)
  - [x] `cd backend && uv run pytest`
  - [x] `cd frontend && npx vitest run`
  - [x] `cd e2e && npx playwright test`

## Dev Notes

### New Dependency: @axe-core/playwright

Install:
```bash
cd e2e && npm install --save-dev @axe-core/playwright
```

Usage pattern:
```ts
import AxeBuilder from "@axe-core/playwright";

const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa"])
  .analyze();

expect(results.violations).toEqual([]);
```

`@axe-core/playwright` is the official Deque-maintained package (the makers of axe-core). The `axe-playwright` package listed in the epic ACs is a community alternative — use `@axe-core/playwright` as the authoritative choice.

### Scanning the Five App States

#### 1. Loaded list state
Seed ≥1 todo via API, navigate to `/`, wait for the todo to appear, then run axe:

```ts
test("loaded list state has no WCAG AA violations", async ({ page, request }) => {
  await createTodo(request, "Accessibility test todo");
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Accessibility test todo", exact: false })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});
```

#### 2. Empty state
No todos: `deleteAllTodos` + navigate + wait for empty state indicator:

```ts
test("empty state has no WCAG AA violations", async ({ page }) => {
  await page.goto("/");
  // Wait for content to fully render (no loading skeleton)
  await page.waitForSelector('[aria-busy="false"], [data-testid="empty-state"], h1', { timeout: 5000 });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});
```

**Note:** Inspect the actual empty state selector at runtime if the above doesn't match. The app shows an empty list when no todos exist — check `frontend/src/components/` for the exact empty state element.

#### 3. Loading skeleton state

Intercept `GET /api/todos` with a 3-second delay, then navigate. The skeleton renders during the delay:

```ts
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
  // The skeleton should be visible while the API is delayed
  // Use a short timeout to catch it before the delayed response arrives
  await page.waitForTimeout(200); // let the skeleton render
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  await page.unroute("**/api/todos");
});
```

**Important:** Check the actual skeleton element in `frontend/src/components/` to find the right selector to wait for. The `page.waitForTimeout(200)` ensures the skeleton is rendered before the axe scan runs. Alternatively, wait for a skeleton-specific element if it has a `aria-busy` or `data-testid` attribute.

#### 4. Error banner state

Intercept `GET /api/todos` to return a 500 error, then navigate and wait for the error banner:

```ts
test("error banner state has no WCAG AA violations", async ({ page }) => {
  await page.route("**/api/todos", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ status: 500, body: "Internal Server Error" });
    } else {
      route.continue();
    }
  });
  await page.goto("/");
  // ErrorBanner uses role="alert" — wait for it
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  await page.unroute("**/api/todos");
  expect(results.violations).toEqual([]);
});
```

**Source:** The ErrorBanner component uses `role="alert"` per the architecture accessibility requirement [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting-Concerns]. If the error banner uses a different selector, check `frontend/src/components/ErrorBanner.tsx`.

#### 5. Dark mode state

```ts
test("dark mode state has no WCAG AA violations", async ({ page, request }) => {
  await createTodo(request, "Dark mode a11y test");
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("theme"));
  await page.reload();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByText("Dark mode a11y test")).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});
```

### Lighthouse Audit (Manual Step, Not a Playwright Test)

The Lighthouse audit is run once manually against the running Docker stack — not as part of the automated E2E test suite. The result is documented in this story's change log.

```bash
# Requires: full Docker stack running (docker compose up)
npx lighthouse http://localhost --only-categories=accessibility \
  --output=json --output-path=/tmp/lighthouse-a11y.json \
  --chrome-flags="--headless --no-sandbox"

# Extract score:
node -e "const r=require('/tmp/lighthouse-a11y.json'); console.log('Score:', r.categories.accessibility.score * 100)"
```

If `lighthouse` is not installed globally:
```bash
npx --yes lighthouse http://localhost --only-categories=accessibility \
  --output=json --output-path=/tmp/lighthouse-a11y.json \
  --chrome-flags="--headless --no-sandbox"
```

**Threshold:** Score must be ≥90. Document the actual score in the change log before marking done.

### E2E Test Conventions (from CLAUDE.md)

- Use `beforeEach` to `deleteAllTodos` so every test starts with clean state
- Do **not** use `afterEach` for teardown — leave state intact on failure
- Always `unroute` any intercepted routes at the end of the test that set them up
- Import shared helpers from `e2e/helpers.ts`: `deleteAllTodos`, `createTodo`, `seedTodos`, `API_BASE`

### Known Accessibility State Already Tested

`e2e/tests/theme-accessibility.spec.ts` already covers:
- Theme toggle keyboard navigation and aria-label
- Tab navigation across all interactive elements
- Focus ring visibility on interactive elements
- WCAG 3:1 contrast ratio for checkbox and placeholder border

The new `accessibility.spec.ts` file complements this with axe WCAG AA full-page scans. There is no overlap because the existing tests check specific CSS/DOM properties rather than running an automated accessibility tree audit.

### TodoRow Locator Gotcha (from MEMORY.md)

`TodoRow` renders as `<li role="button">` whose computed accessible name includes all child button labels (including `aria-label="Delete todo"`). This means `getByRole('button', { name: 'Delete todo' })` matches BOTH the row and the actual delete button. Always use `{ exact: true }` when targeting the delete button specifically.

### Route Cleanup Pattern

After each test that sets up a `page.route`, always `await page.unroute(pattern)` before the test ends. Or use `page.unrouteAll()` if multiple routes were added. This prevents the delayed route from leaking into subsequent tests.

### Axe Violation Failure Output

When `expect(results.violations).toEqual([])` fails, Playwright's error output includes the full violation list. For better readability, you can also format it:

```ts
if (results.violations.length > 0) {
  const violationMessages = results.violations.map(
    (v) => `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map((n) => n.html).join(", ")}`
  );
  throw new Error(`Accessibility violations:\n${violationMessages.join("\n")}`);
}
```

This matches what AC #2 describes: "fails with a report of the specific violation, its impact level, and the affected element".

### Project Structure Notes

- **New file**: `e2e/tests/accessibility.spec.ts`
- **Modified file**: `e2e/package.json` (add `@axe-core/playwright` to devDependencies)
- **No backend changes** — all tests run against existing API
- **No frontend changes expected** unless axe/Lighthouse reveal violations that need fixing
- **No CI changes** — `e2e/tests/accessibility.spec.ts` is automatically picked up by the `e2e` CI job

### Existing Test File Patterns

All spec files in `e2e/tests/` follow the same structure:
1. Imports from `@playwright/test` + `../helpers`
2. `test.beforeEach` with `deleteAllTodos`
3. Individual `test(...)` blocks

Reference `e2e/tests/performance.spec.ts` for the route-interception pattern (already established by Story 5.2).

### References

- Story 5.3 ACs: [Source: _bmad-output/planning-artifacts/epics.md#Story-5.3]
- E2E conventions (beforeEach, no afterEach): [Source: CLAUDE.md#E2E-Test-Conventions]
- Shared helpers: [Source: e2e/helpers.ts]
- axe-core/playwright docs: https://playwright.dev/docs/accessibility-testing (Playwright official guide)
- Route interception pattern (delay + error): [Source: e2e/tests/performance.spec.ts]
- ErrorBanner role="alert": [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting-Concerns]
- Linting: `cd e2e && npx biome check --write .` [Source: CLAUDE.md#Formatting-&-Linting]
- Playwright config (baseURL=http://localhost, 3 browsers): [Source: e2e/playwright.config.ts]
- TodoRow accessible name gotcha: [Source: MEMORY.md]
- Story 5.2 learnings (route interception, beforeEach, helpers extraction): [Source: _bmad-output/implementation-artifacts/5-2-performance-validation.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Installed `@axe-core/playwright@^4.11.1` as E2E dev dependency
- Created `e2e/tests/accessibility.spec.ts` covering 5 app states: loaded list, empty, loading skeleton, error banner, dark mode
- Fixed 3 violations discovered during implementation:
  1. `--muted-foreground` color had 3.88:1 contrast on white (WCAG AA requires 4.5:1) — darkened from `#7f8085` to `#767676` in light mode (minimum value: 4.54:1)
  2. All CSS custom properties converted from oklch to hex to ensure reliable axe parsing across all browsers (Firefox/WebKit returned oklch as computed style, causing axe to compute incorrect contrast ratios)
  3. Dark mode test used dynamic theme toggle; changed to localStorage-set-then-reload approach to avoid CSS variable cascade timing issues in Firefox/WebKit
- Error banner test uses `route.abort()` + 15s timeout (TanStack Query retries 3× before showing error)
- Dark mode test uses `localStorage.setItem("dark")` + `page.reload()` + force-reflow before axe scan
- Lighthouse accessibility score: **100/100** (well above ≥90 threshold)
- All 96 E2E tests pass across Chromium, Firefox, WebKit

### File List

- `e2e/tests/accessibility.spec.ts` (new)
- `e2e/package.json` (modified — add @axe-core/playwright)
- `e2e/package-lock.json` (modified — lockfile update)
- `frontend/src/index.css` (modified — converted CSS vars from oklch to hex, darkened light-mode --muted-foreground to meet WCAG AA 4.5:1)

### Change Log

- 2026-03-10: Implemented story 5.3 — axe WCAG AA accessibility tests for 5 app states, fixed 3 WCAG violations (muted text contrast + CSS var format), Lighthouse score 100/100
- 2026-03-10: Code review fixes — replaced flaky `waitForTimeout(200)` with proper skeleton element assertion, fixed empty state test to wait for skeleton disappearance instead of non-existent `aria-busy` attribute, removed unnecessary `as AxeResult[]` type casts, inlined `formatViolations` into `assertNoViolations`
