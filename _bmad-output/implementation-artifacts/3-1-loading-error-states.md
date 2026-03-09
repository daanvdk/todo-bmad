# Story 3.1: Loading & Error States

Status: done

## Story

As a **user**,
I want clear feedback when data is loading or an operation fails, without the app crashing or blocking me,
so that I always understand what the app is doing and can continue working even when errors occur.

## Acceptance Criteria

1. **Given** the app loads and `GET /todos` is in flight
   **When** the TanStack Query `isPending` state is true
   **Then** skeleton loading rows are shown at the same height as real todo rows (no layout shift)
   **And** the skeleton rows use a pulsing opacity animation
   **And** the `TodoForm` is visible and usable below the skeletons — the user can begin typing before the list loads

2. **Given** the fetch completes successfully
   **When** data arrives
   **Then** skeleton rows are replaced by real todo rows with no visible jump or layout shift

3. **Given** `GET /todos` fails (network error or server error)
   **When** the error state is set
   **Then** an `ErrorBanner` renders below the header with a short label (e.g. "Network issue")
   **And** the `TodoForm` remains visible and usable
   **And** the `ErrorBanner` uses `role="alert"` so screen readers announce it immediately

4. **Given** a create, toggle, or delete mutation fails server-side
   **When** `onError` fires
   **Then** the `ErrorBanner` renders with a short descriptive label (e.g. "Failed to save")
   **And** the UI remains interactive — the user is not blocked from attempting further actions

5. **Given** the error condition resolves (successful subsequent operation or query refetch)
   **When** the error state clears
   **Then** the `ErrorBanner` auto-dismisses without requiring user action

6. **Given** any unhandled client-side JavaScript error occurs
   **Then** the app does not crash or render a blank page — errors are caught at the component boundary

## Tasks / Subtasks

- [x] Task 1: Create `SkeletonRow` component (AC: 1, 2)
  - [x] Create `frontend/src/components/SkeletonRow.tsx`
  - [x] Use `TodoRow` directly — pass skeleton content into its slots (guarantees identical layout, no duplication)
  - [x] `left` slot: `Skeleton` rounded circle (matches checkbox size, ~20px)
  - [x] `content` slot: two stacked `Skeleton` bars — wide bar (todo text) and narrow bar (timestamp)
  - [x] No `right` slot (no action icon in skeleton)
  - [x] `TodoRow` defaults to `as="li"` — no override needed

- [x] Task 2: Update `App.tsx` for loading state (AC: 1, 2)
  - [x] Destructure `isPending` and `isError` from `useListTodos()` (alongside `data`)
  - [x] When `isPending` is true, render 3 `SkeletonRow` components inside a `<ul>` in place of both `TodoSection` components
  - [x] `TodoForm` always renders below — NOT gated on `isPending`
  - [x] When `isPending` is false, render `TodoSection` components as before

- [x] Task 3: Update `App.tsx` for fetch error state (AC: 3, 5)
  - [x] Derive `errorMessage`: `isFetchError ? "Network issue" : error`
  - [x] Render `{errorMessage && <ErrorBanner message={errorMessage} />}` (replaces `{error && <ErrorBanner ...>}`)
  - [x] Add `useEffect` to auto-clear mutation `error` state when query returns fresh data
  - [x] This makes ErrorBanner auto-dismiss: fetch errors clear when query succeeds; mutation errors clear on next successful refetch

- [x] Task 4: Create `ErrorBoundary` component (AC: 6)
  - [x] Create `frontend/src/components/ErrorBoundary.tsx` — class-based React error boundary
  - [x] Catches render/lifecycle errors via `componentDidCatch`
  - [x] Renders a simple fallback UI when error state is set (e.g. "Something went wrong. Please refresh the page.")
  - [x] Accepts `children: ReactNode` and `fallback?: ReactNode` props (if no fallback provided, use default message)

- [x] Task 5: Wrap app in `ErrorBoundary` in `main.tsx` (AC: 6)
  - [x] Import `ErrorBoundary` in `frontend/src/main.tsx`
  - [x] Wrap `<App />` with `<ErrorBoundary>` — inside `StrictMode`, outside `QueryClientProvider` is fine

- [x] Task 6: Add `ErrorBanner.test.tsx` (AC: 3, 4)
  - [x] Create `frontend/src/components/ErrorBanner.test.tsx`
  - [x] Test: renders the message prop
  - [x] Test: has `role="alert"` attribute for screen reader support
  - [x] Test: displays correct message text in the alert element

- [x] Task 7: Update `App.test.tsx` for loading and error states (AC: 1, 2, 3, 5)
  - [x] Add mock for `useListTodos` returning `{ data: undefined, isPending: true, isError: false }` → skeletons rendered, form visible
  - [x] Add mock returning `{ data: undefined, isPending: false, isError: true }` → error banner shows "Network issue", form visible
  - [x] Add test for error auto-dismiss: fetch error resolves → banner disappears on rerender with fresh data

- [x] Task 8: Add `ErrorBoundary.test.tsx` (AC: 6)
  - [x] Create `frontend/src/components/ErrorBoundary.test.tsx`
  - [x] Test: renders children normally when no error thrown
  - [x] Test: renders fallback UI when a child throws (use a component that throws in render)
  - [x] Use `vi.spyOn(console, 'error').mockImplementation(() => {})` to suppress React's error boundary console output during tests

- [x] Task 9: Write E2E tests in `e2e/tests/loading-error-states.spec.ts` (AC: 1, 3)
  - [x] Test: page load shows skeletons briefly then real content (form is immediately usable during loading)
  - [x] Test: GET /todos failure shows error banner with form still usable (15s timeout to allow TanStack Query retries to exhaust)

- [x] Task 10: Lint and verify (all ACs)
  - [x] Run `cd frontend && npx biome check --write .`
  - [x] Run `cd frontend && npx vitest run` — all tests pass (55 tests)
  - [x] Run `cd e2e && npx playwright test` — all E2E tests pass (11 tests)
  - [x] Backend tests pass (12 tests via `uv run pytest`)

## Dev Notes

### Current State of Codebase

Story 2.4 (Complete & Delete Todo) is done. Key state going into Story 3.1:

**`App.tsx` — current relevant state:**
```tsx
function App() {
  const { data: todosResponse } = useListTodos();  // ← only `data` destructured
  const todos = todosResponse?.data ?? [];
  const active = todos.filter((t) => t.is_completed !== true);
  const completed = todos.filter((t) => t.is_completed === true);

  const [error, setError] = useState<string | null>(null);
  const { handleCreate, handleToggle, handleDelete } = useTodoMutations(setError);

  return (
    <ThemeProvider>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <AppHeader />
        {error && <ErrorBanner message={error} />}   // ← only mutation errors surfaced
        <div className="mt-4">
          <TodoSection label="Completed" todos={completed} ... />
          <TodoSection label="Active" todos={active} ... />
          <TodoForm onCreate={handleCreate} />
        </div>
      </main>
    </ThemeProvider>
  );
}
```

**What's missing from AC:**
- `isPending` not extracted → no skeleton rows
- `isError` not extracted → fetch failures silently ignored
- `error` state never auto-clears (persists until page reload)
- No Error Boundary anywhere in the tree

**`ErrorBanner.tsx` — already complete:**
- Has `role="alert"` ✓
- Accepts `message: string` prop ✓
- Has no test file — must create `ErrorBanner.test.tsx` in this story (listed in architecture spec)

**`Skeleton.tsx` — already exists** at `frontend/src/components/ui/Skeleton.tsx`:
```tsx
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--muted)]", className)}
      {...props}
    />
  );
}
```
Uses `animate-pulse` class — this is the pulsing animation. Already uses CSS variables for color (works in both light/dark mode).

**`TodoRow.tsx` — layout reference:**
```tsx
<Tag className={cn(
  "flex min-h-[44px] items-center gap-3 py-3 px-4",
  ...
)}>
```
`SkeletonRow` must match this exact layout to prevent layout shift.

### Implementation Details

#### `SkeletonRow.tsx`

Use `TodoRow` directly to guarantee identical layout — no layout duplication:

```tsx
import { Skeleton } from "@/components/ui/Skeleton";
import { TodoRow } from "@/components/TodoRow";

export function SkeletonRow() {
  return (
    <TodoRow
      aria-hidden="true"
      left={<Skeleton className="h-4 w-4 rounded-full" />}
      content={
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      }
    />
  );
}
```

Notes:
- `aria-hidden="true"` — skeletons are decorative loading indicators, not meaningful content
- `TodoRow` defaults to `as="li"` so it renders correctly inside `<ul>` in App.tsx
- No `onClick` passed → no `cursor-pointer`, hover style, or keyboard handler
- Widths `w-3/4` and `w-1/3` approximate text and timestamp widths without being exact
- Layout shift is impossible — `SkeletonRow` uses the exact same container as real rows
- `TodoRow` does not currently accept `aria-hidden` — add it to `TodoRowProps` as an optional `aria-hidden?: true` prop and spread it onto `<Tag>`, or use a wrapping `<li aria-hidden="true">` with `as="div"` inside

#### `App.tsx` — Updated Loading State Section

```tsx
function App() {
  const { data: todosResponse, isPending, isError: isFetchError } = useListTodos();
  const todos = todosResponse?.data ?? [];
  const active = todos.filter((t) => t.is_completed !== true);
  const completed = todos.filter((t) => t.is_completed === true);

  const [error, setError] = useState<string | null>(null);
  const { handleCreate, handleToggle, handleDelete } = useTodoMutations(setError);

  // Auto-clear mutation error when query returns fresh data
  useEffect(() => {
    if (!isFetchError && todosResponse !== undefined) {
      setError(null);
    }
  }, [todosResponse, isFetchError]);

  // Derive single error message (fetch error takes precedence)
  const errorMessage = isFetchError ? "Network issue" : error;

  return (
    <ThemeProvider>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <AppHeader />
        {errorMessage && <ErrorBanner message={errorMessage} />}
        <div className="mt-4">
          {isPending ? (
            <ul>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </ul>
          ) : (
            <>
              <TodoSection label="Completed" todos={completed} onToggle={handleToggle} onDelete={handleDelete} />
              <TodoSection label="Active" todos={active} onToggle={handleToggle} onDelete={handleDelete} />
            </>
          )}
          <TodoForm onCreate={handleCreate} />
        </div>
      </main>
    </ThemeProvider>
  );
}
```

**Critical:** `<TodoForm>` is outside the `isPending` conditional — always rendered, always usable.

#### Error Auto-Dismiss Behavior

The `useEffect` dependency array `[todosResponse, isFetchError]`:
- **Fetch error resolves**: `isFetchError` goes `true → false` AND `todosResponse` becomes defined → `setError(null)` fires → ErrorBanner disappears
- **Mutation error auto-dismiss**: Failed mutation's `onSettled` calls `invalidateQueries` → TanStack Query refetches → `todosResponse` reference changes → `useEffect` fires → `setError(null)` — error clears after next successful refetch
- **Scenario**: User creates todo, fails → banner shows "Failed to save" → user deletes another todo, that succeeds → `onSettled` invalidates → `GET /todos` refetches with `isFetchError=false` and fresh `todosResponse` → error clears automatically

#### `ErrorBoundary.tsx`

```tsx
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Uncaught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            Something went wrong. Please refresh the page.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
```

#### `main.tsx` — Wrapping with ErrorBoundary

```tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
```

**Note:** `ErrorBoundary` wraps `QueryClientProvider` so even provider-level errors are caught.

### Testing Approach

#### `App.test.tsx` — New Tests

The `mockUseListTodos` already exists. Extend the mock return value to include `isPending` and `isError`:

```tsx
// Existing tests mock: { data: { data: [...] }, isError: false }
// All existing mocks need `isPending: false` added (but as long as the existing
// tests continue to pass without it, the field defaults to undefined/falsy — safe)

// NEW: Loading state test
it("shows skeleton rows and form when loading", async () => {
  mockUseListTodos.mockReturnValue({
    data: undefined,
    isPending: true,
    isError: false,
  } as ReturnType<typeof useListTodos>);
  renderWithClient(<App />);
  // Form is always visible
  await expect(screen.getByRole("textbox", { name: "Add a task" })).toBeInTheDocument();
  // Skeletons rendered (3 of them, aria-hidden)
  // Can't use role directly since aria-hidden — query by class or verify TodoSection not present
  expect(screen.queryByText("Active")).not.toBeInTheDocument();
  expect(screen.queryByText("Completed")).not.toBeInTheDocument();
});

// NEW: Fetch error state test
it("shows 'Network issue' error banner when fetch fails", async () => {
  mockUseListTodos.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: true,
  } as ReturnType<typeof useListTodos>);
  renderWithClient(<App />);
  expect(screen.getByRole("alert")).toHaveTextContent("Network issue");
  expect(screen.getByRole("textbox", { name: "Add a task" })).toBeInTheDocument();
});

// NEW: Error auto-dismiss test
it("clears mutation error when query returns fresh data", async () => {
  // Start with a mutation error set
  const queryClient = newQueryClient();
  // Mock isError=false, no data yet
  mockUseListTodos.mockReturnValueOnce({
    data: undefined,
    isPending: false,
    isError: false,
  } as ReturnType<typeof useListTodos>);
  // Then re-render with fresh data
  mockUseListTodos.mockReturnValue({
    data: { data: [] },
    isPending: false,
    isError: false,
  } as ReturnType<typeof useListTodos>);

  // Simulate mutation error: override useDeleteTodo to call onError
  mockUseDeleteTodo.mockImplementation((opts) => {
    opts?.mutation?.onError?.(new Error("fail"), { todoId: 1 }, undefined);
    return { mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteTodo>;
  });

  const { rerender } = renderWithClient(<App />, queryClient);
  // After rerender with fresh data, error should be cleared
  rerender(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
```

Note: The auto-dismiss test is complex due to needing to simulate mutation lifecycle + rerender. If complexity is high, it's acceptable to test this behavior via integration: write the effect logic simply and rely on the `useEffect` unit being straightforward.

#### `ErrorBanner.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ErrorBanner } from "./ErrorBanner";

describe("ErrorBanner", () => {
  it("renders the message", () => {
    render(<ErrorBanner message="Network issue" />);
    expect(screen.getByText("Network issue")).toBeInTheDocument();
  });

  it("has role=alert for screen reader announcement", () => {
    render(<ErrorBanner message="Failed to save" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("displays the correct message text in the alert element", () => {
    render(<ErrorBanner message="Failed to delete" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to delete");
  });
});
```

#### `ErrorBoundary.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

// Component that throws in render
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test render error");
  return <div>Safe content</div>;
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("renders fallback UI when a child throws", () => {
    // Suppress React error boundary console output
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it("renders custom fallback when provided and child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom error UI")).toBeInTheDocument();
    spy.mockRestore();
  });
});
```

#### `e2e/tests/loading-error-states.spec.ts`

```ts
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  // Clean state for each test
  const res = await request.get("http://localhost/api/todos");
  const todos = await res.json();
  for (const todo of todos) {
    await request.delete(`http://localhost/api/todos/${todo.id}`);
  }
});

test("shows skeleton rows during loading and form is immediately usable", async ({
  page,
}) => {
  // Delay the /api/todos response to observe loading state
  await page.route("/api/todos", async (route) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });

  await page.goto("/");

  // Form is immediately usable (doesn't wait for list)
  const input = page.getByRole("textbox", { name: "Add a task" });
  await expect(input).toBeVisible();
  await expect(input).toBeEnabled();

  // After data loads, form is still present
  await expect(input).toBeVisible();
});

test("shows error banner when GET /todos fails and form stays usable", async ({
  page,
}) => {
  // Abort the todos fetch entirely
  await page.route("/api/todos", (route) => route.abort());

  await page.goto("/");

  // Error banner should appear
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(/network issue/i);

  // Form is still usable despite the error
  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeEnabled();
});
```

### Architecture Compliance Checklist

- [ ] `@/` import alias used for all cross-directory imports
- [ ] `isPending` and `isError` destructured from `useListTodos` — no custom loading/error state for fetch
- [ ] `SkeletonRow` uses `TodoRow` directly — layout shift is impossible by construction
- [ ] `TodoForm` always rendered — NOT gated on `isPending`
- [ ] `ErrorBanner` already has `role="alert"` — no change needed to the component
- [ ] Combined error message: `isFetchError ? "Network issue" : error` — single source of truth for display
- [ ] Auto-dismiss via `useEffect` on `[todosResponse, isFetchError]` — no manual clear buttons
- [ ] `ErrorBoundary` is a class component — required by React error boundary API (cannot be function component)
- [ ] `main.tsx` uses `@/` alias for `ErrorBoundary` import
- [ ] Skeleton uses existing `Skeleton` UI component (`animate-pulse` class built in) — no new animation code
- [ ] `SkeletonRow` has `aria-hidden="true"` — decorative element, not announced by screen reader
- [ ] E2E tests use `page.route()` for network interception — no external mocking libraries
- [ ] Biome run after all changes: `cd frontend && npx biome check --write .`

### Previous Story Intelligence (Story 2.4)

Critical learnings from Story 2.4 that affect this story:

- **`useTodoMutations.ts`** uses `makeOptimisticHandlers` from `lib/optimisticMutation.ts`. The `setError` callback is passed directly from `App.tsx`. In this story, adding `setError(null)` via `useEffect` means the same `setError` function clears both mutation errors and nothing changes in `useTodoMutations.ts` — it's purely an `App.tsx` concern.

- **`ErrorBanner` was created in Story 2.4** — it uses `role="alert"` already. The component accepts `message: string`. No changes to `ErrorBanner.tsx` needed in this story.

- **Biome 2.4.x** — run `npx biome check --write .` after all changes. Watch for unused `useEffect` import issues (ensure it's imported from "react").

- **`App.test.tsx` mock structure**: The mock uses `importOriginal` to preserve `getListTodosQueryKey`. The `useListTodos` mock returns `{ data: ..., isError: false }`. Existing tests must add `isPending: false` to their mock return values — but since `undefined` is falsy, existing tests may continue to work without change. **Verify this during implementation** to avoid breaking existing tests.

- **`renderWithClient` wraps in `QueryClientProvider`** — all App tests use this. The `useEffect` in the updated App will fire after render in tests; be careful with timing.

- **ErrorBoundary in tests**: React's `StrictMode` causes effects to run twice. The `ErrorBoundary` test should NOT be wrapped in `StrictMode` to avoid double `componentDidCatch` invocations. Standard `render()` from `@testing-library/react` is fine.

### Git Intelligence

Recent commits:
- `179e20d Epic 2 retrospective` — Epic 2 retro completed, Epic 3 is now the active work
- `dcf3a2f Todo update/delete` — Story 2.4 complete. Created: `ErrorBanner.tsx`, `useTodoMutations.ts`, `lib/optimisticMutation.ts`, `lib/optimisticMutation.test.ts`. Modified: `App.tsx`, `App.test.tsx`, `TodoItem.test.tsx`. Created: `e2e/tests/complete-delete-todo.spec.ts`
- `812f0b3 Todo create` — Story 2.3. `useCreateTodo` wired with optimistic pattern
- `fe20b0c Todo list view` — Story 2.2. All UI components established

This story is **entirely frontend** — no backend changes, no API regeneration needed. All changes are in `frontend/src/` and `e2e/`.

### Project Structure — Files to Modify/Create

```
frontend/src/
├── App.tsx                            MODIFIED — add isPending/isError, SkeletonRow, errorMessage, useEffect
├── App.test.tsx                       MODIFIED — add loading/error state tests
├── main.tsx                           MODIFIED — wrap with ErrorBoundary
└── components/
    ├── ErrorBanner.test.tsx           CREATED — tests for ErrorBanner (missing from Story 2.4)
    ├── ErrorBoundary.tsx              CREATED — React class-based error boundary
    ├── ErrorBoundary.test.tsx         CREATED — tests for ErrorBoundary
    └── SkeletonRow.tsx                CREATED — skeleton loading row matching TodoRow layout

e2e/tests/
└── loading-error-states.spec.ts      CREATED — E2E tests for loading and error states

Files NOT changed:
- ErrorBanner.tsx (no changes needed)
- TodoSection.tsx (loading handled in App.tsx, not TodoSection)
- useTodoMutations.ts (no changes needed)
- lib/optimisticMutation.ts (no changes needed)
- backend/ (no backend changes)
- frontend/src/api/generated/ (no API changes)
```

### References

- Story acceptance criteria [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1]
- Loading state requirements FR-10 [Source: _bmad-output/planning-artifacts/epics.md#Requirements Inventory]
- Error state requirements FR-11, NFR-05 [Source: _bmad-output/planning-artifacts/epics.md#Requirements Inventory]
- Skeleton loading pattern [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Loading State Patterns]
- Error banner pattern [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Error Patterns]
- TodoRow layout specs [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy (TodoRow)]
- ErrorBanner component spec [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy (ErrorBanner)]
- FR-10 implementation location [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- Error surfacing architecture [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- Story 2.4 completion notes [Source: _bmad-output/implementation-artifacts/2-4-complete-delete-todo.md#Completion Notes List]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Created `SkeletonRow.tsx` using `TodoRow` with `aria-hidden={true}` — layout shift impossible by construction
- Updated `TodoRow.tsx` to accept optional `aria-hidden` prop (spread onto rendered tag)
- Updated `App.tsx`: destructured `isPending`/`isError` from `useListTodos`; conditional skeleton/section rendering; `useEffect` auto-clear of mutation errors on fresh data; unified `errorMessage` expression
- Created class-based `ErrorBoundary.tsx` wrapping `QueryClientProvider` in `main.tsx`
- Added `ErrorBanner.test.tsx` (3 tests), `ErrorBoundary.test.tsx` (3 tests), updated `App.test.tsx` (+3 tests)
- Added `e2e/tests/loading-error-states.spec.ts` (2 tests); error banner test uses 15s timeout to allow TanStack Query's 3 retries to exhaust before `isError` is set
- All 55 unit tests, 11 E2E tests, and 12 backend tests pass

### File List

- `frontend/src/components/SkeletonRow.tsx` — CREATED
- `frontend/src/components/ErrorBoundary.tsx` — CREATED
- `frontend/src/components/ErrorBanner.test.tsx` — CREATED
- `frontend/src/components/ErrorBoundary.test.tsx` — CREATED
- `frontend/src/components/TodoRow.tsx` — MODIFIED (added `aria-hidden` prop)
- `frontend/src/App.tsx` — MODIFIED (isPending/isError, SkeletonRow, useEffect, errorMessage)
- `frontend/src/main.tsx` — MODIFIED (wrapped with ErrorBoundary)
- `frontend/src/App.test.tsx` — MODIFIED (added 3 new tests)
- `e2e/tests/loading-error-states.spec.ts` — CREATED

### Change Log

- 2026-03-09: Implemented story 3.1 — loading skeleton rows, fetch/mutation error banners, auto-dismiss via useEffect, ErrorBoundary component, and full test coverage across unit and E2E layers.
- 2026-03-09: **Spec note** — the skeleton approach has inherent limitations. The 3 rows are shown without section labels ("Active"/"Completed"), so when real content loads there will always be a structural layout shift regardless of row heights matching. The "no layout shift" AC is only partially achieved. The spec was optimising for row height consistency but overlooked the section label structure. Worth revisiting in retro.
- 2026-03-09: **Spec note** — the `useEffect` auto-clear of mutation errors fires on any `todosResponse` reference change, which includes background refetches (TanStack Query default `staleTime` is 0). A mutation error like "Failed to save" could be dismissed in under a second if a background refetch completes (e.g., on window refocus) before the user reads it. The implementation matches AC5's spec ("auto-dismiss on successful subsequent operation or query refetch") but the UX may be too aggressive. Consider adding a minimum display time or clearing only on user-initiated actions. Worth revisiting in retro.
- 2026-03-09: **Code review fixes** — strengthened skeleton assertions in E2E and unit tests (skeletons now verified present during loading), added mutation error display test for AC4, narrowed `TodoRow` `aria-hidden` type to `true` only.
