# Story 5.1: Test Coverage Analysis & Improvement

Status: done

## Story

As a **developer**,
I want test coverage measured and enforced at >=70% on both backend and frontend,
So that critical paths are verified and regressions are caught reliably.

## Acceptance Criteria

1. **Given** the backend test suite **When** `pytest --cov=app --cov-report=term-missing` runs **Then** a per-module coverage report is printed to stdout **And** overall line coverage is >=70%

2. **Given** the frontend test suite **When** `vitest run --coverage` runs **Then** a per-file coverage report is produced **And** overall statement/line coverage is >=70%

3. **Given** the CI pipeline (`backend-checks` and `frontend-checks` jobs) **When** coverage falls below 70% **Then** the relevant job fails with a clear coverage summary in the output

4. **Given** the coverage reports **When** gaps are identified in critical paths (API endpoints, mutation hooks, error handling, utility functions) **Then** new tests are written to cover those gaps before the story is marked complete

5. **Given** `pytest-cov` as a backend dev dependency and `@vitest/coverage-v8` as a frontend dev dependency **Then** both are added to the respective dependency manifests

## Tasks / Subtasks

- [x] Install backend coverage tooling (AC: #5)
  - [x] Add `pytest-cov` to `pyproject.toml` dev dependencies via `uv add --dev pytest-cov`
  - [x] Verify `pytest --cov=app --cov-report=term-missing` runs and produces a report
- [x] Install frontend coverage tooling (AC: #5)
  - [x] Add `@vitest/coverage-v8` to `package.json` devDependencies via `npm install -D @vitest/coverage-v8`
  - [x] Add coverage config to `vite.config.ts` under `test.coverage`
  - [x] Verify `npx vitest run --coverage` runs and produces a report
- [x] Measure current coverage and identify gaps (AC: #4)
  - [x] Run backend coverage, note uncovered lines
  - [x] Run frontend coverage, note uncovered files/lines
  - [x] Identify critical gaps that need new tests
- [x] Write missing tests to reach >=70% (AC: #1, #2, #4)
  - [x] Frontend: `useTodoMutations.ts` hook test (77 lines, untested, non-trivial)
  - [x] Any other gaps found during coverage analysis
- [x] Update CI pipeline for coverage enforcement (AC: #3)
  - [x] `backend-checks` job: change `pytest` to `pytest --cov=app --cov-report=term-missing --cov-fail-under=70`
  - [x] `frontend-checks` job: change `vitest run` to `vitest run --coverage`
  - [x] Add vitest coverage threshold config to `vite.config.ts`
- [x] Run all three test layers + linters to confirm green

## Dev Notes

### Current Test Infrastructure State

**Backend** (12 tests, all passing):
- `tests/conftest.py` — async SQLite in-memory fixtures, `client` + `session` fixtures
- `tests/test_main.py` — 2 tests (health check, OpenAPI spec)
- `tests/routes/test_todos.py` — 10 tests (all CRUD operations + validation)
- Coverage tooling: **NOT installed** (`pytest-cov` missing from `pyproject.toml`)
- Backend source is ~140 SLOC across 5 meaningful files — likely already near or above 70%

**Frontend** (61 tests across 10 test files, all passing):
- `App.test.tsx` — 13 integration tests (full todo lifecycle)
- `components/AppHeader.test.tsx` — header + theme toggle
- `components/ErrorBanner.test.tsx` — error display
- `components/ErrorBoundary.test.tsx` — error boundary
- `components/TodoForm.test.tsx` — 11 tests (creation flow)
- `components/TodoItem.test.tsx` — item interactions
- `components/TodoRow.test.tsx` — row layout
- `components/TodoSection.test.tsx` — section rendering
- `hooks/useTheme.test.ts` — theme hook with localStorage/matchMedia mocks
- `lib/optimisticMutation.test.ts` — 9 tests for mutation utility
- Coverage tooling: **NOT installed** (`@vitest/coverage-v8` missing from `package.json`)

**E2E** (7 spec files, 72 tests across 3 browsers): No coverage changes needed.

### Known Coverage Gaps (Frontend)

1. **`hooks/useTodoMutations.ts`** (~77 lines) — Integrates create/toggle/delete mutations with optimistic updates. This is a **non-trivial hook** and per CLAUDE.md rules, hooks in `frontend/src/hooks/` MUST have a corresponding `.test.ts` file. This is the main gap to fill.

2. **`components/SkeletonRow.tsx`** — No dedicated test. Check coverage report; may be covered via `TodoSection.test.tsx` or `App.test.tsx` integration tests.

3. **`components/ThemeProvider.tsx`** — No dedicated test. Likely covered via `useTheme.test.ts` integration.

4. **Exempt files** (per CLAUDE.md — thin wrappers, re-exports, or files exercised through component tests):
   - `components/ui/Button.tsx` — thin shadcn wrapper
   - `components/ui/Checkbox.tsx` — thin shadcn wrapper
   - `components/ui/Input.tsx` — thin shadcn wrapper
   - `components/ui/Skeleton.tsx` — pure CSS/styling
   - `lib/utils.ts` — single `cn()` function (6 lines, thin wrapper around clsx+twMerge)

### CI Pipeline Changes

Current `.github/workflows/ci.yml` has four jobs. Only two need changes:

**`backend-checks`** — current pytest step:
```yaml
- name: Run tests
  run: uv run pytest
```
Change to:
```yaml
- name: Run tests with coverage
  run: uv run pytest --cov=app --cov-report=term-missing --cov-fail-under=70
```

**`frontend-checks`** — current vitest step:
```yaml
- name: Run tests
  run: npx vitest run
```
Change to:
```yaml
- name: Run tests with coverage
  run: npx vitest run --coverage
```

The coverage threshold for frontend should be configured in `vite.config.ts` rather than CLI flags:
```ts
test: {
  coverage: {
    provider: 'v8',
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/api/generated/**', 'src/test-setup.ts', 'src/main.tsx'],
    thresholds: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
}
```

**Important**: Exclude `src/api/generated/` from coverage — these are Orval-generated files, never hand-edited.

### Testing `useTodoMutations` Hook

This is the primary test to write. The hook uses TanStack Query's `useMutation` with the optimistic update pattern. Test approach:

- Use `renderHook` from `@testing-library/react` with a `QueryClientProvider` wrapper
- Mock the Orval-generated API functions (`listTodos`, `createTodo`, `updateTodo`, `deleteTodo`)
- Test each mutation (create, toggle, delete) triggers the correct API call
- Test error handling paths
- The optimistic update logic itself is already tested in `lib/optimisticMutation.test.ts` — avoid duplicating those tests. Focus on the hook's integration: correct API function called, correct arguments passed, error state set.

### Vitest Coverage Config

Add to `vite.config.ts` under the existing `test` block. The `provider: 'v8'` option uses V8's built-in coverage (fast, no instrumentation). The `thresholds` block causes `vitest run --coverage` to exit non-zero when coverage drops below 70%.

### Backend Coverage Config

No config file changes needed for backend. `pytest-cov` reads configuration from `pyproject.toml` if needed, but CLI flags (`--cov=app --cov-report=term-missing --cov-fail-under=70`) are sufficient. The `--cov=app` flag scopes coverage to the `app/` package only (excludes `tests/`, `alembic/`).

### Docker HMR Note

Per CLAUDE.md: after editing frontend files, `touch` each changed file before relying on hot-reload or running tests. This story mostly adds config and test files, but remember to touch any modified `.ts`/`.tsx` files.

### Project Structure Notes

- New files expected: `frontend/src/hooks/useTodoMutations.test.ts`
- Modified files: `backend/pyproject.toml`, `frontend/package.json`, `frontend/vite.config.ts`, `.github/workflows/ci.yml`
- No Alembic migration needed — no DB changes
- No API client regeneration needed — no endpoint changes

### References

- Story 5.1 acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md#Story-5.1]
- Epic 5 objective: [Source: _bmad-output/planning-artifacts/epics.md#Epic-5]
- Architecture testing section: [Source: _bmad-output/planning-artifacts/architecture.md#Testing]
- CI pipeline: [Source: .github/workflows/ci.yml]
- CLAUDE.md utility file testing rule: [Source: CLAUDE.md#Utility-File-Testing]
- CLAUDE.md verification habits: [Source: CLAUDE.md#Verification-Habits]
- Previous story (4.3) learnings: [Source: _bmad-output/implementation-artifacts/4-3-docker-compose-health-checks-service-dependencies.md]
- Backend test commands: `cd backend && uv run pytest` (NOT via docker compose)
- Frontend test commands: `cd frontend && npx vitest run`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

**Phase 1 — Tooling & initial coverage:**
- Installed `pytest-cov==7.0.0` via `uv add --dev pytest-cov`.
- Installed `@vitest/coverage-v8` via `npm install -D`.
- Added coverage config to `vite.config.ts`: provider v8, excludes `src/api/generated/**` + `src/test-setup.ts` + `src/main.tsx`, thresholds at 70% for all four metrics.
- Wrote `frontend/src/hooks/useTodoMutations.test.ts` (initial 6 tests).
- Updated CI: `backend-checks` → `pytest --cov=app --cov-report=term-missing --cov-fail-under=70`; `frontend-checks` → `vitest run --coverage`.

**Phase 2 — Coverage gap analysis & improvement:**
- Fixed backend asyncio coverage tracking: added `[tool.coverage.run] concurrency = ["thread", "greenlet"]` to `pyproject.toml`. Before: `todos.py` showed 59% despite all tests passing (coverage.py missed lines after `await` due to event loop context switching). After: `todos.py` 100%, backend total 98%.
- Extended `useTodoMutations.test.ts` from 6 → 12 tests: added error callback tests for all three mutations, optimistic updater tests for create/update/delete, and mutation option capture infrastructure.
- Added dark-theme branch test to `AppHeader.test.tsx`.
- Added dark→light toggle test to `useTheme.test.ts`.
- Added empty-cache guard test to `optimisticMutation.test.ts`.

**Final coverage:**
- Backend: 98% total (only `database.py:12-13` excluded — deliberate, see gap analysis below)
- Frontend: 97.43% stmts / 96.72% branches / 96.29% funcs / 98.11% lines (76 tests, 11 files)

**Coverage gap analysis — remaining uncovered code (deliberate decisions):**

*Backend:*
- **`database.py:12-13`** — `get_session` function body (`async with AsyncSession(engine) as session: yield session`). **Deliberate exclusion.** The test suite overrides this dependency with an in-memory SQLite fixture via `app.dependency_overrides[get_session]`. Testing the production `get_session` would require a live PostgreSQL connection, which belongs in integration/smoke tests, not the unit test suite. The function is a one-liner with no logic to validate.

*Frontend:*
- **`TodoForm.tsx:18` (branch)** — `if (!el) return;` inside the `useEffect` click handler. **Deliberate exclusion.** Defensive null-guard for a ref that is always populated in a mounted component. The scenario (`rowRef.current` is null after mount) cannot occur in normal or reasonably adversarial usage. Testing it would require jsdom-level ref manipulation with no practical benefit.
- **`TodoForm.tsx:29` (branch)** — The false branch of `if (hasText)` in `handleSubmit`. **Deliberate exclusion.** The submit button is `disabled={!hasText}`, making programmatic form submission with empty text the only way to reach this branch. It is an unreachable defensive guard in normal UI interaction. Testing it via `fireEvent.submit` with empty text adds noise without validating user-facing behavior.
- **`TodoItem.tsx:25-26`** — Inline `onClick={(e) => e.stopPropagation()}` handler on the Checkbox. **Deliberate exclusion.** This prevents event bubbling from the checkbox click up to the row's `onClick`. The row-level `TodoItem.test.tsx` tests do exercise the checkbox click path, but V8 coverage tracks the inline arrow function as a separate uncovered function entity because `stopPropagation` is not explicitly asserted. The behavior is validated end-to-end (clicking checkbox doesn't double-fire toggle). A test asserting `e.stopPropagation()` was called would be testing browser API internals, not application logic.

### File List

- `backend/pyproject.toml` (added `pytest-cov` dev dependency + `[tool.coverage.run]` concurrency config)
- `backend/uv.lock` (updated lock file)
- `frontend/package.json` (added `@vitest/coverage-v8` dev dependency)
- `frontend/package-lock.json` (updated lock file)
- `frontend/vite.config.ts` (added `test.coverage` config block)
- `frontend/src/hooks/useTodoMutations.test.ts` (new — 12 tests)
- `frontend/src/components/AppHeader.test.tsx` (added dark-theme branch test)
- `frontend/src/hooks/useTheme.test.ts` (added dark→light toggle test)
- `frontend/src/lib/optimisticMutation.test.ts` (added empty-cache guard test)
- `.github/workflows/ci.yml` (updated `backend-checks` and `frontend-checks` test steps)
- `.gitignore` (added `.coverage` and `coverage/` patterns)
- `frontend/biome.json` (excluded `coverage/` from Biome linting)
- `frontend/src/hooks/useTodoMutations.ts` (fixed `nextTempId` to `useRef`, simplified boolean comparison)

### Change Log

- 2026-03-10: Implemented story 5.1 — installed coverage tooling, configured CI enforcement at 70%, wrote hook tests, fixed asyncio tracking, extended coverage with gap analysis. Backend 98%, frontend 97%+.
- 2026-03-10: Raised enforcement thresholds from 70% → 90% in both CI (`--cov-fail-under=90`) and `vite.config.ts` (all four metrics). Current coverage (98% BE / 97%+ FE) makes 90% a meaningful gate rather than a formality. The ACs specify "at least 70%" so this overachieves the requirement rather than changing it.
- 2026-03-10: Code review fixes — (1) Added `.coverage` and `coverage/` to `.gitignore` and excluded `coverage/` in `frontend/biome.json` so local coverage artifacts don't cause lint errors; (2) Fixed `nextTempId` from local `let` to `useRef` to persist unique IDs across re-renders; (3) Simplified redundant `!(todo.is_completed === true)` to `!todo.is_completed`; (4) Removed redundant `makeHookSetup()` call from `beforeEach` in useTodoMutations test; (5) Corrected test counts in Dev Agent Record (useTodoMutations: 16→12, optimisticMutation: 11→9); (6) Added missing `backend/uv.lock` to File List.
- 2026-03-10: **Retro note — escaped bug from story 2-4.** The `nextTempId` bug (local `let` resetting on every re-render) originated in story 2-4 (`dcf3a2f`). The original implementation used a timestamp-based temp ID. The 2-4 code review correctly flagged this as a collision risk, and the user directed a refactor to a decrementing counter to guarantee uniqueness. However, this refactor was performed *during the review stage itself* — meaning the fix (changing to `let nextTempId = -1; nextTempId--`) was applied as part of the review's own fixes and was never itself reviewed by fresh eyes. The refactor addressed the collision symptom but missed the React lifecycle issue: a local `let` resets to -1 on every re-render, making the counter pointless. This highlights a blind spot in the current workflow: **changes made during code review bypass review entirely.** The bug then went undetected through stories 3-1 through 4-3 because: (1) optimistic IDs are short-lived (replaced on server response), so collisions rarely manifest visibly; (2) no unit test existed for `useTodoMutations.ts` until this story — per CLAUDE.md rules it should have been written in 2-4 when the hook was created; (3) subsequent code reviews focused on their own story scope and didn't re-examine pre-existing code. **Action items for retro:** (a) establish a process for reviewing changes made during the review stage — either a second-pass review, or limiting review-stage fixes to trivial/mechanical changes and sending non-trivial refactors back to a dev pass; (b) code review should verify React hook rules (state, refs, effects) as a first-class checklist item; (c) the CLAUDE.md rule requiring hook tests was violated in 2-4 and should have been enforced during that review; (d) consider adding a "pre-existing code smells" pass to the review workflow for files that are dependencies of the story under review.
- 2026-03-10: Considered raising further to 100% using coverage exclusion pragmas (`# pragma: no cover`, `/* v8 ignore next */`) for the three deliberate gaps. Decided against it. The workflow benefit (forcing every gap to be an explicit in-code decision) is real, but the 100% headline becomes a false statistic — it communicates more confidence than actually exists and pragmas can be silently abused under deadline pressure. The current approach (97-98% actual coverage + gap analysis documented here) is more honest. The 90% threshold with documented deliberate gaps is the chosen position.
