# Story 5.2: Performance Validation

Status: done

## Story

As a **developer**,
I want the PRD performance benchmarks validated against the running app,
So that there is documented evidence that NFR-01, NFR-02, and NFR-03 are actually met — not just assumed.

## Acceptance Criteria

1. **Given** the app running with at least 20 todos seeded in the database
   **When** a Playwright test measures time from navigation start to todos being visible
   **Then** the time to first meaningful render is ≤1000ms (NFR-02)

2. **Given** a create mutation triggered via Playwright with the `POST /api/todos` route artificially delayed by 2000ms via `page.route`
   **When** measured from click/Enter to new todo appearing in the DOM
   **Then** the UI reflects the new item in ≤200ms — confirming the update is optimistic and does not wait for the server response (NFR-01)

3. **Given** the backend API
   **When** 20 sequential `GET /todos` requests are made and response times are recorded
   **Then** the p95 response time is ≤500ms (NFR-03)

4. **Given** the performance test results
   **Then** they are committed as a Playwright test in `e2e/tests/performance.spec.ts` that asserts the above thresholds
   **And** the test runs as part of the standard E2E suite in CI

## Tasks / Subtasks

- [x] Seed 20+ todos before performance measurements (AC: #1, #2, #3)
  - [x] Use `beforeAll` or dedicated seeder helper via Playwright `request` API
  - [x] Delete all todos before seeding to ensure clean, known state
- [x] Implement NFR-02 test: initial render ≤1000ms (AC: #1)
  - [x] Navigate to `/` with pre-seeded todos
  - [x] Measure from `performance.getEntriesByType('navigation')[0].startTime` to first todo visible
  - [x] Assert measured time ≤1000ms
- [x] Implement NFR-01 test: optimistic create ≤200ms under artificial 2s network delay (AC: #2)
  - [x] Use `page.route("**/api/todos", ...)` to intercept `POST /api/todos` and delay fulfillment by 2000ms
  - [x] Fill input, record timestamp, press Enter, wait for new todo in DOM, record end timestamp
  - [x] Assert elapsed time ≤200ms (proves update is optimistic — if it waited for server it would take >2000ms)
  - [x] Unroute or let route scope end after the test
- [x] Implement NFR-03 test: API p95 ≤500ms (AC: #3)
  - [x] Make 20 sequential `GET /api/todos` requests using Playwright `request` context
  - [x] Record response time for each request
  - [x] Compute p95 (sort array, take value at index `Math.ceil(20 * 0.95) - 1`)
  - [x] Assert p95 ≤500ms
- [x] Run linter on new file (AC: #4)
  - [x] `cd e2e && npx biome check --write .`
- [x] Run E2E suite to confirm new tests pass
  - [x] `cd e2e && npx playwright test tests/performance.spec.ts`

## Dev Notes

### File to Create

**One new file only:**
- `e2e/tests/performance.spec.ts`

No backend, frontend, or CI changes needed — the test plugs into the existing standard E2E suite automatically (Playwright picks up all `*.spec.ts` in `e2e/tests/`).

### E2E Test Conventions (from CLAUDE.md)

- Use `beforeEach` to delete all todos so every test starts with a clean slate.
- Do **not** use `afterEach` for teardown. Leaving state intact on failure makes it possible to inspect what went wrong.
- However: performance tests need data. Use `beforeAll` to seed the 20 todos once, then a lighter `beforeEach` if needed to ensure state. See below for recommended approach.

### API Base URL

```ts
const API_BASE = "http://localhost/api";
```

Use `request.get(...)`, `request.post(...)`, `request.delete(...)` from the Playwright `APIRequestContext` (passed to test via `{ request }`).

### Seeding 20 Todos

Create them via `POST /api/todos` inside a `beforeAll`. Example pattern (reuse from other specs):

```ts
async function deleteAllTodos(request: APIRequestContext) {
  const res = await request.get(`${API_BASE}/todos`);
  const todos = await res.json();
  for (const todo of todos) {
    await request.delete(`${API_BASE}/todos/${todo.id}`);
  }
}

async function seedTodos(request: APIRequestContext, count: number) {
  for (let i = 1; i <= count; i++) {
    await request.post(`${API_BASE}/todos`, {
      data: { text: `Performance test todo ${i}` },
    });
  }
}
```

**Important:** Use `test.describe` scope so `beforeAll` seeds once for the entire describe block, not per-test. Clean before seeding to ensure exactly 20 todos.

### NFR-02: Initial Render ≤1000ms

The AC says "using `performance.getEntriesByType`". The correct approach is to navigate to the page and then measure using the Navigation Timing API inside the browser context:

```ts
await page.goto("/");
// Wait for at least one todo to be visible
await page.waitForSelector('[role="listitem"]', { timeout: 5000 });

const loadTime = await page.evaluate(() => {
  const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return nav.domContentLoadedEventEnd - nav.startTime;
});

expect(loadTime).toBeLessThan(1000);
```

Alternatively, use wall-clock timing around `page.goto` + `waitForSelector` if the navigation timing API is unavailable:

```ts
const start = Date.now();
await page.goto("/");
await page.waitForSelector('[role="listitem"]');
const elapsed = Date.now() - start;
expect(elapsed).toBeLessThan(1000);
```

**Recommended:** Use the wall-clock approach as it most faithfully represents the user experience and avoids cross-browser differences in the Performance API. The navigation timing approach is also acceptable but only measures browser-internal timing, not the full `goto()` + element visibility chain.

### NFR-01: Optimistic Create ≤200ms (with artificial 2s network delay)

Simply measuring ≤200ms without controlling the network would not prove optimistic behaviour — a fast local backend could satisfy the threshold even without optimistic updates. The test must prove causation, not just coincidence.

**The approach:** intercept `POST /api/todos` with `page.route` and delay its fulfillment by 2000ms. If the todo appears in the DOM in ≤200ms despite the server taking 2s, the update is unambiguously optimistic.

```ts
// Intercept POST /todos and delay server response by 2s
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
await page.waitForSelector("text=Perf test task");
const elapsed = Date.now() - start;

expect(elapsed).toBeLessThan(200);

// Clean up route so it doesn't affect other tests
await page.unroute("**/api/todos");
```

**Why this works:** The optimistic update fires in `onMutate` synchronously before any `await` for the API call. React re-renders immediately, putting the todo in the DOM. The `page.route` delay only affects when the server response arrives — the DOM update is already done by then.

**Route scoping:** Use `page.unroute` after the assertion so the delayed route doesn't leak into subsequent tests. Alternatively, use a separate `page` fixture or nest inside a `test.describe` with scoped routes.

**Timeout note:** `page.waitForSelector` default timeout is 30s — set it to 1000ms to fail fast if the optimistic update is broken: `page.waitForSelector("text=Perf test task", { timeout: 1000 })`.

### NFR-03: API p95 ≤500ms

Use Playwright `request` (not `page`) for direct HTTP calls — this avoids browser rendering overhead:

```ts
const times: number[] = [];
for (let i = 0; i < 20; i++) {
  const start = Date.now();
  await request.get(`${API_BASE}/todos`);
  times.push(Date.now() - start);
}

times.sort((a, b) => a - b);
const p95 = times[Math.ceil(times.length * 0.95) - 1];

expect(p95).toBeLessThan(500);
```

This is sequential (not parallel) as the AC specifies. With 20 requests and the app running locally, p95 should be well under 100ms under normal conditions.

### Performance Test Isolation: Run Chromium Only

**Recommendation:** Scope `performance.spec.ts` to run on chromium only by using `test.use({ ...devices["Desktop Chrome"] })` inside the describe block, OR by using a `project` filter. This prevents triple-running of performance tests across chromium/firefox/webkit and avoids cross-browser timing variability inflating results.

However, the ACs do not explicitly specify single-browser. If running on all three browsers is acceptable (the tests will likely pass on all), don't add complexity. The simplest approach is no special browser filtering — let it run on all three as the config dictates.

### CI Behavior

The test is in `e2e/tests/` — it will automatically be picked up by the `e2e` CI job. No CI changes needed.

**Potential CI flakiness:** Performance tests are inherently more sensitive to environment. The thresholds in the ACs (1000ms, 200ms, 500ms) have significant headroom for a local single-user development stack. However, CI runners may be slower. If tests fail on CI but pass locally, the thresholds may need adjustment or `retries: 1` added. Address this if it becomes an issue during implementation.

### Project Structure Notes

- **File location**: `e2e/tests/performance.spec.ts` (matches pattern of all other specs)
- **No imports needed** beyond `@playwright/test` built-ins
- **No new dependencies** — Playwright is already installed
- **No backend/frontend changes** — API already supports sequential requests; no seeding endpoint needed

### References

- Story 5.2 ACs: [Source: _bmad-output/planning-artifacts/epics.md#Story-5.2]
- NFR-01, NFR-02, NFR-03: [Source: _bmad-output/planning-artifacts/epics.md#NonFunctional-Requirements]
- Epic 5 objective: [Source: _bmad-output/planning-artifacts/epics.md#Epic-5]
- E2E conventions (beforeEach, no afterEach): [Source: CLAUDE.md#E2E-Test-Conventions]
- Playwright config (baseURL, workers, projects): [Source: e2e/playwright.config.ts]
- E2E API pattern (deleteAllTodos, API_BASE): [Source: e2e/tests/create-todo.spec.ts]
- Linting: `cd e2e && npx biome check --write .` [Source: CLAUDE.md#Formatting-&-Linting]
- Frontend unit tests: `cd frontend && npx vitest run` [Source: MEMORY.md]
- Backend tests: `cd backend && uv run pytest` [Source: MEMORY.md]
- Story 5.1 learnings: [Source: _bmad-output/implementation-artifacts/5-1-test-coverage-analysis-improvement.md]

### Learnings from Story 5.1

- Linter (Biome) must be run after writing test files — `cd e2e && npx biome check --write .`
- All three test layers must pass before reporting done (backend pytest, frontend vitest, E2E playwright)
- CI `e2e` job runs on Docker stack — tests must work against `http://localhost` (Caddy proxy in front)
- Backend tests use `cd backend && uv run pytest` (not docker compose)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Initial attempt used `[role="listitem"]` selector for waiting on todos; failed because TodoRow renders as `<li role="button">` (overrides implicit listitem role). Fixed by switching to `text=Performance test todo 1`.

### Completion Notes List

- Created `e2e/tests/performance.spec.ts` with 3 NFR tests covering NFR-01, NFR-02, NFR-03
- Used `test.describe` + `beforeAll` to seed 20 todos once per browser project (vs per-test)
- Wall-clock timing used for NFR-02 (more faithful to user experience than Navigation Timing API)
- NFR-01 uses `page.route` to delay POST by 2000ms, proving optimistic update fires before server responds
- NFR-03 makes 20 sequential GET requests and asserts p95 ≤500ms (actual results: ~35-45ms)
- All 9 tests pass across chromium/firefox/webkit; full 81-test E2E suite passes; backend and frontend unit tests pass
- Timing results: NFR-02 ~160-790ms (well under 1000ms threshold); NFR-01 optimistic update fires in <50ms (test duration includes 2s delayed POST but assertion passes); NFR-03 p95 ~35-45ms (well under 500ms)

### File List

- `e2e/helpers.ts` (new — shared E2E test helpers extracted from all specs)
- `e2e/tests/performance.spec.ts` (new)
- `e2e/tests/create-todo.spec.ts` (modified — import helpers)
- `e2e/tests/complete-delete-todo.spec.ts` (modified — import helpers)
- `e2e/tests/loading-error-states.spec.ts` (modified — import helpers)
- `e2e/tests/todo-list-view.spec.ts` (modified — import helpers)
- `e2e/tests/theme-accessibility.spec.ts` (modified — import helpers)
- `e2e/tests/responsive-layout.spec.ts` (modified — import helpers)

### Change Log

- 2026-03-10: Implemented story — created `e2e/tests/performance.spec.ts` with NFR-01, NFR-02, NFR-03 Playwright tests; all 9 tests pass across 3 browsers; full suite (81 tests), backend (13), and frontend unit (76) all green.
- 2026-03-10: Code review fixes — (1) replaced `beforeAll` with `beforeEach` for test isolation per CLAUDE.md convention; (2) replaced legacy `page.waitForSelector("text=...")` with modern `page.getByText()` locator API + `{ exact: true }` to avoid strict mode violations; (3) added response validation in seed/cleanup helpers; (4) added `test.slow()` for CI flakiness mitigation; (5) extracted shared `deleteAllTodos`, `seedTodos`, `createTodo`, `API_BASE` into `e2e/helpers.ts` and updated all 7 spec files to import from it. Note: NFR-02 uses wall-clock `Date.now()` timing instead of epic AC's `performance.getEntriesByType` — intentional deviation for more faithful user experience measurement (see Dev Notes).
