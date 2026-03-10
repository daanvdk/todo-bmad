# Test Coverage Report — todo-bmad

**Date:** 2026-03-10
**Stories:** 5.1 — Test Coverage Analysis & Improvement; 5.2 — Performance Validation
**Auditor:** Claude Sonnet 4.6 (automated)
**Scope:** Backend Python unit test coverage, frontend TypeScript unit test coverage, E2E test suite inventory, performance NFR validation (NFR-01, NFR-02, NFR-03), CI coverage enforcement

---

## Summary

| Area | Status | Finding |
|------|--------|---------|
| Backend unit test coverage | ✅ Pass | 98% line coverage (threshold ≥90%) |
| Frontend unit test coverage | ✅ Pass | 97%+ stmts/branches/funcs/lines (threshold ≥90%) |
| E2E test suite | ✅ Pass | 32 unique tests across 9 spec files, 3 browsers |
| CI coverage enforcement | ✅ Pass | Backend ≥90%, frontend ≥90% gated in CI |
| NFR-01: Optimistic update ≤200ms | ✅ Pass | <50ms measured under artificial 2s network delay |
| NFR-02: Initial render ≤1000ms | ✅ Pass | 160–790ms measured (20 seeded todos) |
| NFR-03: API p95 ≤500ms | ✅ Pass | ~35–45ms measured (20 sequential GET requests) |

**Overall test posture: PASS** — All coverage thresholds exceeded; all performance NFRs validated with automated Playwright tests.

---

## 1. Test Suite Overview

| Layer | Tests | Files | Notes |
|-------|-------|-------|-------|
| Backend unit | 13 | 2 test files | Python, pytest |
| Frontend unit | 76 | 11 test files | TypeScript, Vitest |
| E2E | 32 unique | 9 spec files | Playwright, 3 browsers (Chromium, Firefox, WebKit) — count is unique tests, not browser-multiplied |

**Total unique tests: 121.** E2E tests run across 3 browsers; the count above reflects unique tests, not total runs.

---

## 2. Backend Unit Test Coverage

**Tool:** `pytest-cov 7.0.0`
**Command:** `cd backend && uv run pytest --cov=app --cov-report=term-missing`
**Scope:** `app/` package only (excludes `tests/`, `alembic/`)

### Coverage Results

| Module | Coverage |
|--------|----------|
| `app/main.py` | 100% |
| `app/models.py` | 100% |
| `app/routes/todos.py` | 100% |
| `app/settings.py` | 100% |
| `app/database.py` | Partial (session factory excluded — see §7) |
| **Total** | **98%** |

CI enforcement: `--cov-fail-under=90`

### Test Files

| File | Tests | What It Covers |
|------|-------|----------------|
| `tests/test_main.py` | 2 | Health check endpoint, OpenAPI spec |
| `tests/routes/test_todos.py` | 10 | Full CRUD: list, create, fetch, update, delete + input validation |
| `tests/conftest.py` | — | Async SQLite in-memory fixtures; `client` and `session` fixtures |

**Total: 13 tests, all passing.**

**Verdict: PASS** — Backend coverage 98%, exceeding the ≥90% CI threshold. AC #1 (Story 5.1) satisfied.

---

## 3. Frontend Unit Test Coverage

**Tool:** `@vitest/coverage-v8`
**Command:** `cd frontend && npx vitest run --coverage`
**Scope:** `src/**/*.{ts,tsx}` (excludes `src/api/generated/**`, `src/test-setup.ts`, `src/main.tsx`)

### Coverage Results

| Metric | Coverage | Threshold |
|--------|----------|-----------|
| Statements | 97.43% | ≥90% ✓ |
| Branches | 96.72% | ≥90% ✓ |
| Functions | 96.29% | ≥90% ✓ |
| Lines | 98.11% | ≥90% ✓ |

CI enforcement: configured in `vite.config.ts` under `test.coverage.thresholds` (all four metrics ≥90%).

### Test Files

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `App.test.tsx` | 14 | Full todo lifecycle integration tests |
| `components/AppHeader.test.tsx` | 3 | Header, theme toggle (light and dark branches) |
| `components/ErrorBanner.test.tsx` | 3 | Error display, `role="alert"` for screen readers |
| `components/ErrorBoundary.test.tsx` | 3 | Error boundary: children pass-through, fallback UI |
| `components/TodoForm.test.tsx` | 11 | Creation flow, input validation, submit behaviour |
| `components/TodoItem.test.tsx` | 8 | Item interactions: complete, delete, strikethrough state |
| `components/TodoRow.test.tsx` | 3 | Row slot layout (left, content, right) |
| `components/TodoSection.test.tsx` | 4 | Section rendering: loaded, empty, label visibility |
| `hooks/useTodoMutations.test.ts` | 12 | Create/toggle/delete mutations, error callbacks, optimistic updater integration |
| `hooks/useTheme.test.ts` | 6 | Theme hook: system preference, localStorage override, toggle |
| `lib/optimisticMutation.test.ts` | 9 | Optimistic update utility: add, update, delete, rollback, empty-cache guard |

**Total: 76 tests, all passing.**

**Verdict: PASS** — Frontend coverage 97%+ across all four metrics, exceeding the ≥90% CI threshold. AC #2 (Story 5.1) satisfied.

---

## 4. E2E Test Suite

**Tool:** Playwright
**Browsers:** Chromium, Firefox, WebKit
**Test directory:** `e2e/tests/`
**Shared helpers:** `e2e/helpers.ts` (deleteAllTodos, seedTodos, createTodo, API_BASE)

### Spec Files

| Spec File | Tests | What It Covers |
|-----------|-------|----------------|
| `todos.spec.ts` | 1 | Smoke test: app loads without errors |
| `todo-list-view.spec.ts` | 4 | Initial load, list rendering, persistence across reload |
| `create-todo.spec.ts` | 1 | Todo creation, optimistic update |
| `complete-delete-todo.spec.ts` | 3 | Completion toggle, delete, persistence |
| `loading-error-states.spec.ts` | 2 | Skeleton loading state, error banner, recovery |
| `responsive-layout.spec.ts` | 7 | Layout at 375px mobile and 1280px desktop |
| `theme-accessibility.spec.ts` | 6 | Theme toggle, ARIA labels, cursor, Tab navigation, focus rings, contrast |
| `accessibility.spec.ts` | 5 | Full-page axe WCAG AA scans across 5 app states |
| `performance.spec.ts` | 3 | NFR-01, NFR-02, NFR-03 performance benchmarks |

**Total: 32 unique tests across 9 spec files, all passing.**

**Verdict: PASS** — Full user-facing feature coverage across major flows; error states, accessibility, and performance validated as part of the standard E2E suite.

---

## 5. Performance Validation

**Tool:** Playwright (`e2e/tests/performance.spec.ts`)
**Environment:** Full Docker stack at `http://localhost` (Caddy proxy)
**Prerequisites:** 20 todos seeded via API before each test using `beforeEach`

### NFR-01: Optimistic UI Update ≤200ms

| Condition | Measurement Method | Measured | Threshold |
|-----------|-------------------|----------|-----------|
| `POST /api/todos` delayed by 2000ms via `page.route` | Wall-clock from Enter key to todo visible in DOM | <50ms | ≤200ms ✓ |

`page.route` intercepts `POST /api/todos` and delays the server response by 2000ms. The todo appearing in under 200ms — despite the 2-second server delay — confirms the UI update is optimistic and does not wait for the server response.

**Verdict: PASS** — NFR-01 satisfied. AC #2 (Story 5.2) satisfied.

### NFR-02: Initial Render ≤1000ms

| Condition | Measurement Method | Measured | Threshold |
|-----------|-------------------|----------|-----------|
| 20 todos pre-seeded | Wall-clock from `page.goto("/")` to first todo visible | 160–790ms | ≤1000ms ✓ |

**Verdict: PASS** — NFR-02 satisfied. AC #1 (Story 5.2) satisfied.

### NFR-03: API Response Time p95 ≤500ms

| Condition | Measurement Method | Measured p95 | Threshold |
|-----------|-------------------|-------------|-----------|
| 20 sequential `GET /api/todos` requests | Wall-clock per request; p95 of sorted array | ~35–45ms | ≤500ms ✓ |

**Verdict: PASS** — NFR-03 satisfied. AC #3 (Story 5.2) satisfied.

---

## 6. CI Enforcement

**Pipeline:** `.github/workflows/ci.yml`

| Job | Command | Enforcement |
|-----|---------|-------------|
| `backend-checks` | `uv run pytest --cov=app --cov-report=term-missing --cov-fail-under=90` | Fails if coverage <90% |
| `frontend-checks` | `npx vitest run --coverage` | Fails if any metric <90% (via `vite.config.ts`) |
| `e2e` | `npx playwright test` | All 32 unique tests run on every push |

Coverage thresholds are enforced at 90%, exceeding the ≥70% AC minimum. The higher threshold provides a meaningful regression gate at the project's actual coverage level.

**Verdict: PASS** — CI enforces coverage on every push. AC #3 (Story 5.1) satisfied.

---

## 7. Accepted Limitations

No unresolved coverage or performance issues were found. The following items are documented as accepted limitations:

**Accepted coverage gaps:**

- **`database.py:12–13`** — `get_session` function body. The test suite overrides this dependency with an in-memory SQLite fixture via `app.dependency_overrides[get_session]`. Testing the production session factory requires a live PostgreSQL connection; the function contains no logic to validate.

- **`TodoForm.tsx:18` (branch)** — `if (!el) return;` null-guard inside a `useEffect` click handler. The ref (`rowRef.current`) is always populated in a mounted component; this branch is unreachable in normal usage.

- **`TodoForm.tsx:29` (branch)** — False branch of `if (hasText)` in `handleSubmit`. The submit button is `disabled={!hasText}`, making programmatic form submission with empty text the only way to reach this branch — an unreachable defensive guard under normal UI interaction.

- **`TodoItem.tsx:25–26`** — Inline `onClick={(e) => e.stopPropagation()}` on the Checkbox. V8 coverage tracks this inline arrow function as a separate uncovered entity. The behaviour is validated end-to-end: clicking the checkbox does not double-fire the toggle handler. Asserting `e.stopPropagation()` was called would test browser API internals, not application logic.

**Informational:**

- `src/api/generated/` is excluded from frontend coverage. These files are Orval-generated and never hand-edited; including them would inflate coverage numbers without meaningful signal.

- Performance test thresholds (1000ms, 200ms, 500ms) carry significant headroom relative to measured results — see Section 5 for actuals.

---

## Appendix: Audit Commands Used

```bash
# Backend unit tests with coverage
cd backend && uv run pytest --cov=app --cov-report=term-missing --cov-fail-under=90

# Frontend unit tests with coverage
cd frontend && npx vitest run --coverage

# E2E suite (includes performance and accessibility tests)
cd e2e && npx playwright test

# Performance tests only
cd e2e && npx playwright test tests/performance.spec.ts
```
