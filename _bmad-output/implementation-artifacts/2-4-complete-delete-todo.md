# Story 2.4: Complete & Delete Todo

Status: done

## Story

As a **user**,
I want to mark a todo as complete and delete todos,
so that I can track my progress and keep my list relevant.

## Acceptance Criteria

1. **Given** an active todo is visible
   **When** the user clicks/taps anywhere on the todo row (or its checkbox)
   **Then** the todo immediately moves to the Completed section with strikethrough + dimmed styling (optimistic update)
   **And** `PATCH /todos/{id}` is called in the background with `{"is_completed": true}`

2. **Given** a completed todo is visible
   **When** the user clicks/taps anywhere on the todo row (or its checkbox)
   **Then** the todo immediately moves back to the Active section with normal styling (optimistic toggle)
   **And** `PATCH /todos/{id}` is called in the background with `{"is_completed": false}`

3. **Given** the optimistic toggle succeeds server-side
   **When** `onSettled` fires
   **Then** the query cache is invalidated and refetched, confirming the server state

4. **Given** a todo (active or completed) is visible
   **When** the user clicks/taps the trash icon on that todo's row
   **Then** the todo is immediately removed from the list (optimistic delete)
   **And** `DELETE /todos/{id}` is called in the background

5. **Given** deleting the last todo
   **When** the optimistic delete fires
   **Then** the list shows only the `TodoForm` with no section labels

6. **Given** the optimistic toggle or delete fails server-side
   **When** `onError` fires
   **Then** the query cache is restored to the snapshot from `onMutate`
   **And** an error is surfaced for the ErrorBanner to display (sets `error` state in App.tsx)

7. **Given** the trash icon and the checkbox on any row
   **Then** the trash icon click stops event propagation so it does not trigger the row toggle

## Tasks / Subtasks

- [x] Task 1: Add `useUpdateTodo` mutation with optimistic toggle to `App.tsx` (AC: 1, 2, 3, 6)
  - [x] Import `useUpdateTodo` from generated API client (alongside existing imports)
  - [x] Set up `useUpdateTodo` with `onMutate` / `onError` / `onSettled` following the same pattern as `useCreateTodo`
  - [x] `onMutate`: cancel queries, snapshot, map over cache to flip `is_completed` for the matching `todoId`
  - [x] `onError`: restore snapshot, call `setError("Failed to save")`
  - [x] `onSettled`: invalidate query
  - [x] Define `handleToggle(id: number)`: find todo by id, call `updateTodo({ todoId: id, data: { is_completed: !(todo.is_completed === true) } })`

- [x] Task 2: Add `useDeleteTodo` mutation with optimistic delete to `App.tsx` (AC: 4, 5, 6)
  - [x] Import `useDeleteTodo` from generated API client
  - [x] Set up `useDeleteTodo` with `onMutate` / `onError` / `onSettled`
  - [x] `onMutate`: cancel queries, snapshot, filter out the deleted `todoId` from cache
  - [x] `onError`: restore snapshot, call `setError("Failed to delete")`
  - [x] `onSettled`: invalidate query
  - [x] Define `handleDelete(id: number)`: call `deleteTodoMutation({ todoId: id })`

- [x] Task 3: Rename `_error` to `error` in `App.tsx` and pass handlers to `TodoSection` (AC: 1, 2, 4)
  - [x] Rename `const [_error, setError]` to `const [error, setError]` — it is now consumed (ErrorBanner reads it, even if ErrorBanner renders null for now)
  - [x] Pass `onToggle={handleToggle} onDelete={handleDelete}` to both `<TodoSection>` calls
  - [x] Note: `ErrorBanner` component did not exist — created at `frontend/src/components/ErrorBanner.tsx` with `message: string` prop, wired into JSX below `<AppHeader />`

- [x] Task 4: Update `App.test.tsx` mock and add toggle/delete tests (AC: 1, 2, 4)
  - [x] Add `useUpdateTodo` and `useDeleteTodo` to the `vi.mock` of generated API module
  - [x] Import and type-mock `useUpdateTodo` and `useDeleteTodo` with `vi.mocked`
  - [x] Add test: clicking a todo row calls `updateTodo` mutate with correct `{ todoId, data: { is_completed: true } }`
  - [x] Add test: clicking a completed todo row calls `updateTodo` mutate with `{ todoId, data: { is_completed: false } }`
  - [x] Add test: clicking the trash icon calls `deleteTodoMutation` mutate with `{ todoId }`

- [x] Task 5: Add `TodoItem.test.tsx` tests for propagation guard (AC: 7)
  - [x] Add test: clicking the trash icon calls `onDelete` and does NOT call `onToggle`
  - [x] Add test: clicking the row calls `onToggle` and does NOT call `onDelete`

- [x] Task 6: Write E2E tests in `e2e/tests/complete-delete-todo.spec.ts` (AC: 1, 2, 4, 5)
  - [x] `beforeEach`: delete all todos via API
  - [x] Test: toggle active→completed (todo moves to Completed section, persists after reload)
  - [x] Test: toggle completed→active (todo moves back to Active section)
  - [x] Test: delete todo (disappears from list, only form remains if last)

- [x] Task 7: Lint and verify (all ACs)
  - [x] Run `cd frontend && npx biome check --write .`
  - [x] Run `cd frontend && npx vitest run` — all tests pass (38/38)
  - [x] Run `cd e2e && npx playwright test` — all e2e tests pass (9/9)
  - [x] Verify in browser: toggle a todo — moves to Completed; toggle back — moves to Active; delete — disappears

## Dev Notes

### Current State of Codebase

Story 2.3 is done. The key state of the codebase going into Story 2.4:

**`App.tsx` — current state:**
- Has `useCreateTodo` with full optimistic pattern (onMutate/onError/onSettled) — use this as the pattern to follow exactly
- Has `const [_error, setError] = useState<string | null>(null)` — underscore-prefixed because `error` was unused. Rename to `error` in this story since it will now be consumed (or at minimum rendered).
- Renders `<TodoSection label="Completed" todos={completed} />` and `<TodoSection label="Active" todos={active} />` — **NOT passing `onToggle` or `onDelete` yet**. This story wires those up.
- `todos` variable is already derived: `const todos = todosResponse?.data ?? []`

**`TodoItem.tsx` — already complete for this story:**
- Already accepts `onToggle?: (id: number) => void` and `onDelete?: (id: number) => void`
- Row click calls `onToggle?.(todo.id)` — entire row is the toggle target
- Trash icon button click calls `onDelete?.(todo.id)` and stops propagation (`e.stopPropagation()`)
- Checkbox `onCheckedChange` also calls `onToggle?.(todo.id)` and `onClick` stops propagation
- No changes needed to `TodoItem.tsx` for this story

**`TodoSection.tsx` — already complete for this story:**
- Already accepts `onToggle?: (id: number) => void` and `onDelete?: (id: number) => void`
- Passes them down to each `<TodoItem>`
- No changes needed to `TodoSection.tsx` for this story

**This story is entirely about wiring `App.tsx` — two new mutations and passing handlers to `TodoSection`.**

### App.tsx Changes

**Step 1: Update imports**

Add `useUpdateTodo` and `useDeleteTodo` to the existing import:

```tsx
import {
  getListTodosQueryKey,
  useCreateTodo,
  useDeleteTodo,
  useUpdateTodo,
  useListTodos,
} from "@/api/generated/todos/todos";
```

**Step 2: Rename `_error` → `error`**

```tsx
const [error, setError] = useState<string | null>(null);
```

**Step 3: Add `useUpdateTodo` mutation**

```tsx
const { mutate: updateTodo } = useUpdateTodo({
  mutation: {
    onMutate: async ({ todoId, data }) => {
      await queryClient.cancelQueries({ queryKey: getListTodosQueryKey() });
      const snapshot = queryClient.getQueryData<listTodosResponse>(
        getListTodosQueryKey(),
      );
      queryClient.setQueryData<listTodosResponse>(
        getListTodosQueryKey(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((t) =>
              t.id === todoId ? { ...t, is_completed: data.is_completed } : t,
            ),
          };
        },
      );
      return { snapshot };
    },
    onError: (_err, _variables, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(getListTodosQueryKey(), context.snapshot);
      }
      setError("Failed to save");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
    },
  },
});

const handleToggle = (id: number) => {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  updateTodo({ todoId: id, data: { is_completed: !(todo.is_completed === true) } });
};
```

**Step 4: Add `useDeleteTodo` mutation**

```tsx
const { mutate: deleteTodoMutation } = useDeleteTodo({
  mutation: {
    onMutate: async ({ todoId }) => {
      await queryClient.cancelQueries({ queryKey: getListTodosQueryKey() });
      const snapshot = queryClient.getQueryData<listTodosResponse>(
        getListTodosQueryKey(),
      );
      queryClient.setQueryData<listTodosResponse>(
        getListTodosQueryKey(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((t) => t.id !== todoId),
          };
        },
      );
      return { snapshot };
    },
    onError: (_err, _variables, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(getListTodosQueryKey(), context.snapshot);
      }
      setError("Failed to delete");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
    },
  },
});

const handleDelete = (id: number) => {
  deleteTodoMutation({ todoId: id });
};
```

**Step 5: Pass handlers to both `<TodoSection>` calls and wire ErrorBanner**

```tsx
return (
  <ThemeProvider>
    <main className="max-w-2xl mx-auto px-4 py-8">
      <AppHeader />
      {error && <ErrorBanner message={error} />}
      <div className="mt-4">
        <TodoSection
          label="Completed"
          todos={completed}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
        <TodoSection
          label="Active"
          todos={active}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
        <TodoForm onCreate={handleCreate} />
      </div>
    </main>
  </ThemeProvider>
);
```

**Note on ErrorBanner props:** Check `frontend/src/components/ErrorBanner.tsx` to see what props it currently accepts. If it accepts `message: string`, use `<ErrorBanner message={error} />`. If its interface differs, adapt accordingly. The key constraint: `error` state must be consumed in JSX so Biome doesn't flag it as unused. If ErrorBanner isn't ready to consume it, use `{/* error: {error} */}` as a comment or render `null` conditionally — but the cleanest solution is importing and using `ErrorBanner` since it already exists.

**Note on `error` clearing:** For this story, `error` does not auto-clear. That's addressed in Story 3.1 (Loading & Error States). The banner will persist until the next successful operation or page reload. This is acceptable for now — Story 3.1 will add auto-dismiss logic.

### Generated Hook Signatures

**`useUpdateTodo` — toggle completion:**
```ts
useUpdateTodo({
  mutation: {
    onMutate: async (variables: { todoId: number; data: TodoUpdate }) => { ... },
    onError: (error, variables, context) => { ... },
    onSettled: () => { ... },
  }
})

// TodoUpdate type (from todoBmadAPI.schemas.ts):
interface TodoUpdate {
  is_completed: boolean;  // required, not optional
}

// Invoke:
const { mutate: updateTodo } = useUpdateTodo({ mutation: { ... } });
updateTodo({ todoId: 5, data: { is_completed: true } });
```

**`useDeleteTodo` — remove from list:**
```ts
useDeleteTodo({
  mutation: {
    onMutate: async (variables: { todoId: number }) => { ... },
    onError: (error, variables, context) => { ... },
    onSettled: () => { ... },
  }
})

// Invoke:
const { mutate: deleteTodoMutation } = useDeleteTodo({ mutation: { ... } });
deleteTodoMutation({ todoId: 5 });
```

**Important — `is_completed` toggle logic:**
```ts
// TodoPublic.is_completed is typed as `boolean | undefined`
// The App already uses: t.is_completed !== true (active) and t.is_completed === true (completed)
// Follow the same pattern when computing the toggled value:
const handleToggle = (id: number) => {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  // !(todo.is_completed === true) correctly handles undefined → true
  updateTodo({ todoId: id, data: { is_completed: !(todo.is_completed === true) } });
};
```

### Testing Approach

**`App.test.tsx` — update mock and add tests:**

```tsx
vi.mock("@/api/generated/todos/todos", () => ({
  useListTodos: vi.fn(),
  useCreateTodo: vi.fn(() => ({ mutate: vi.fn() })),
  useUpdateTodo: vi.fn(() => ({ mutate: vi.fn() })),
  useDeleteTodo: vi.fn(() => ({ mutate: vi.fn() })),
  getListTodosQueryKey: () => ["/todos"],
}));
```

Add to the destructured imports and mocked variables:
```tsx
const { useListTodos, useCreateTodo, useUpdateTodo, useDeleteTodo } = await import(
  "@/api/generated/todos/todos"
);
const mockUseListTodos = vi.mocked(useListTodos);
const mockUseCreateTodo = vi.mocked(useCreateTodo);
const mockUseUpdateTodo = vi.mocked(useUpdateTodo);
const mockUseDeleteTodo = vi.mocked(useDeleteTodo);
```

New tests:
```tsx
it("calls updateTodo mutate when active todo row is clicked", async () => {
  const mockMutate = vi.fn();
  mockUseUpdateTodo.mockReturnValue({
    mutate: mockMutate,
  } as unknown as ReturnType<typeof useUpdateTodo>);
  mockUseListTodos.mockReturnValue({
    data: {
      data: [{ id: 10, text: "Active item", is_completed: false, created_at: "2026-03-06T10:00:00" }],
    },
    isError: false,
  } as ReturnType<typeof useListTodos>);
  renderWithClient(<App />);
  // Click the todo row — entire row is the toggle target
  await userEvent.click(screen.getByText("Active item"));
  expect(mockMutate).toHaveBeenCalledWith(
    { todoId: 10, data: { is_completed: true } },
    expect.anything(),
  );
});

it("calls updateTodo mutate with is_completed: false when completed todo row is clicked", async () => {
  const mockMutate = vi.fn();
  mockUseUpdateTodo.mockReturnValue({
    mutate: mockMutate,
  } as unknown as ReturnType<typeof useUpdateTodo>);
  mockUseListTodos.mockReturnValue({
    data: {
      data: [{ id: 11, text: "Done item", is_completed: true, created_at: "2026-03-06T10:00:00" }],
    },
    isError: false,
  } as ReturnType<typeof useListTodos>);
  renderWithClient(<App />);
  await userEvent.click(screen.getByText("Done item"));
  expect(mockMutate).toHaveBeenCalledWith(
    { todoId: 11, data: { is_completed: false } },
    expect.anything(),
  );
});

it("calls deleteTodoMutation mutate when trash icon is clicked", async () => {
  const mockMutate = vi.fn();
  mockUseDeleteTodo.mockReturnValue({
    mutate: mockMutate,
  } as unknown as ReturnType<typeof useDeleteTodo>);
  mockUseListTodos.mockReturnValue({
    data: {
      data: [{ id: 12, text: "Delete me", is_completed: false, created_at: "2026-03-06T10:00:00" }],
    },
    isError: false,
  } as ReturnType<typeof useListTodos>);
  renderWithClient(<App />);
  await userEvent.click(screen.getByRole("button", { name: "Delete todo" }));
  expect(mockMutate).toHaveBeenCalledWith(
    { todoId: 12 },
    expect.anything(),
  );
});
```

**`TodoItem.test.tsx` — add propagation guard tests:**

```tsx
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

it("clicking the row calls onToggle and not onDelete", async () => {
  const onToggle = vi.fn();
  const onDelete = vi.fn();
  render(
    <ul>
      <TodoItem todo={activeTodo} onToggle={onToggle} onDelete={onDelete} />
    </ul>,
  );
  await userEvent.click(screen.getByText("Buy groceries"));
  expect(onToggle).toHaveBeenCalledWith(activeTodo.id);
  expect(onDelete).not.toHaveBeenCalled();
});

it("clicking the trash icon calls onDelete and not onToggle", async () => {
  const onToggle = vi.fn();
  const onDelete = vi.fn();
  render(
    <ul>
      <TodoItem todo={activeTodo} onToggle={onToggle} onDelete={onDelete} />
    </ul>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Delete todo" }));
  expect(onDelete).toHaveBeenCalledWith(activeTodo.id);
  expect(onToggle).not.toHaveBeenCalled();
});
```

**`e2e/tests/complete-delete-todo.spec.ts` — E2E tests:**

Follow the same pattern as `create-todo.spec.ts`:

```ts
import { type APIRequestContext, expect, test } from "@playwright/test";

const API_BASE = "http://localhost/api";

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

test("toggle: marking a todo complete moves it to Completed section and persists after reload", async ({
  page,
}) => {
  await page.goto("/");

  // Create a todo first
  const input = page.getByRole("textbox", { name: "Add a task" });
  await input.fill("Read the docs");
  await input.press("Enter");
  await expect(page.getByText("Read the docs")).toBeVisible();

  // Click the row to complete it
  await page.getByText("Read the docs").click();

  // Should appear in the Completed section
  await expect(page.getByText("Completed")).toBeVisible();
  await expect(page.getByText("Active")).not.toBeVisible();

  // Persists after reload
  await page.reload();
  await expect(page.getByText("Completed")).toBeVisible();
  await expect(page.getByText("Read the docs")).toBeVisible();
});

test("toggle: marking a completed todo active moves it back to Active section", async ({
  page,
}) => {
  await page.goto("/");

  // Create and complete a todo
  const input = page.getByRole("textbox", { name: "Add a task" });
  await input.fill("Finish report");
  await input.press("Enter");
  await page.getByText("Finish report").click();
  await expect(page.getByText("Completed")).toBeVisible();

  // Toggle back to active
  await page.getByText("Finish report").click();
  await expect(page.getByText("Active")).toBeVisible();
  await expect(page.getByText("Completed")).not.toBeVisible();
});

test("delete: deleting the only todo leaves only the input form", async ({
  page,
}) => {
  await page.goto("/");

  // Create a todo
  const input = page.getByRole("textbox", { name: "Add a task" });
  await input.fill("Temporary task");
  await input.press("Enter");
  await expect(page.getByText("Temporary task")).toBeVisible();

  // Delete it
  await page.getByRole("button", { name: "Delete todo" }).click();

  // Only the input form should remain, no section labels
  await expect(page.getByText("Temporary task")).not.toBeVisible();
  await expect(page.getByText("Active")).not.toBeVisible();
  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeVisible();
});
```

### Architecture Compliance Checklist

- [x] `@/` import alias used for all cross-directory imports
- [x] `getListTodosQueryKey()` used for all cache operations — never hardcoded key arrays
- [x] Optimistic update pattern applied to ALL three mutations: `onMutate` / `onError` / `onSettled`
- [x] `onMutate` returns `{ snapshot }` for rollback in `onError`
- [x] `onSettled` always calls `invalidateQueries` regardless of success/error
- [x] `useUpdateTodo` called with `{ todoId, data: { is_completed: bool } }` matching generated hook signature
- [x] `useDeleteTodo` called with `{ todoId }` matching generated hook signature
- [x] `TodoUpdate.is_completed` is `boolean` (not optional) — always pass a concrete boolean value
- [x] Toggle logic uses `!(todo.is_completed === true)` to safely handle `boolean | undefined` type
- [x] Both `<TodoSection>` components receive `onToggle` and `onDelete` handlers
- [x] `error` state (renamed from `_error`) consumed in JSX — no Biome unused-variable warning
- [x] `frontend/src/api/generated/` never edited by hand — no API regeneration needed (no endpoint changes this story)
- [x] No backend changes needed — all four endpoints already implemented in Story 2.1

### Previous Story Intelligence (Story 2.3)

Critical learnings from Story 2.3:

- **`is_completed` is `boolean | undefined`** — always check with `=== true` (not just truthy). The optimistic toggle for `setQueryData` passes `data.is_completed` directly from `TodoUpdate` which is `boolean` — this is fine. But `handleToggle` must compute the new value using `!(todo.is_completed === true)` to handle the `undefined` case correctly.
- **Biome 2.4.x** — run `npx biome check --write .` after all changes. Watch for import ordering issues.
- **`App.test.tsx` mock must include ALL hooks used in App.tsx** — if `useUpdateTodo` or `useDeleteTodo` are imported but not mocked, tests will fail or throw. The `vi.mock` factory must cover them.
- **`renderWithClient` wraps in `QueryClientProvider`** — already present in `App.test.tsx`. All new App tests must use `renderWithClient(<App />)`.
- **`useQueryClient()` works because `main.tsx` wraps in `QueryClientProvider`** — the `App.tsx` code is safe; no change needed at root level.
- **`todos` array is derived before mutations** — `handleToggle` uses `todos.find(...)` which refers to the current `todosResponse?.data ?? []`. This is a closure over the current render's data — correct behavior.
- **`mutate` call signature** — the second argument to `mutate()` can be an options object (`{ onSuccess, onError }`). In tests, `expect(mockMutate).toHaveBeenCalledWith({ todoId, data }, expect.anything())` — use `expect.anything()` for the second arg if present, or just check the first arg with `toHaveBeenCalledWith(expect.objectContaining({ todoId, data }))`.

### Git Intelligence

Recent commits:
- `0b0bac7 Todo create` — Story 2.3. `useCreateTodo` wired in `App.tsx` with full optimistic pattern. Use as exact template for the two new mutations.
- `fe20b0c Todo list view` — Story 2.2. All UI components in place: `TodoItem` (with `onToggle`/`onDelete` props and stop-propagation guards), `TodoSection` (with `onToggle`/`onDelete` passthrough), `TodoRow`, `TodoForm`, etc.
- `228c8a6 Add todo model & endpoints` — Backend fully implemented. All four endpoints tested. `useUpdateTodo` and `useDeleteTodo` hooks generated and in `frontend/src/api/generated/todos/todos.ts`.

This story is purely frontend wiring in `App.tsx` — no backend changes, no API regeneration.

### Project Structure — Files to Modify

```
frontend/src/
├── App.tsx                        MODIFIED — add useUpdateTodo + useDeleteTodo mutations, rename _error → error, pass handlers to TodoSection, wire ErrorBanner
└── App.test.tsx                   MODIFIED — add useUpdateTodo + useDeleteTodo to vi.mock, add 3 new mutation tests

frontend/src/components/
├── TodoItem.test.tsx              MODIFIED — add 2 new propagation guard tests
e2e/tests/
└── complete-delete-todo.spec.ts  NEW — 3 E2E tests for toggle and delete flows
```

No changes to: `TodoItem.tsx`, `TodoSection.tsx`, `TodoRow.tsx`, `TodoForm.tsx`, backend, or generated API client.

### References

- Story acceptance criteria [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4]
- Optimistic update pattern [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- Query key functions usage [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns]
- UX: row click = toggle target, trash = delete, no confirmation dialogs [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 4]
- UX: trash click stops propagation [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy (TodoItem)]
- Story 2.3 completion notes [Source: _bmad-output/implementation-artifacts/2-3-create-todo.md#Completion Notes List]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Implemented `useUpdateTodo` with full optimistic toggle pattern (onMutate/onError/onSettled)
- Implemented `useDeleteTodo` with full optimistic delete pattern
- Renamed `_error` → `error` state; now consumed by `ErrorBanner` in JSX
- Created `ErrorBanner` component (did not pre-exist despite story notes); accepts `message: string`
- Passed `onToggle={handleToggle}` and `onDelete={handleDelete}` to both `<TodoSection>` instances
- Post-review refactor: extracted all mutation logic into `useTodoMutations` hook; introduced `makeOptimisticHandlers` generic helper that takes `(queryClient, getQueryKey, getUpdater, errorMessage, setError)` and returns `{onMutate, onError, onSettled}` — eliminates duplication across all three mutations
- Fixed test assertions: `mutate` is called with one argument (no options object)
- Fixed E2E delete test: used `{ exact: true }` on `getByRole('button', { name: 'Delete todo' })` because `<li role="button">` accessible name also includes "Delete todo"
- All 38 unit tests pass; all 9 E2E tests pass; Biome clean

### Future Consideration (deferred from review)

`handleToggle` and `handleDelete` in `useTodoMutations` are recreated on every render. If `TodoItem` is wrapped in `React.memo` in the future, revisit:
1. `useCallback` on `handleToggle` and `handleDelete` (stabilises references to prevent memo from being bypassed)
2. Read `todos` from `queryClient.getQueryData(getListTodosQueryKey())` inside `handleToggle` instead of closing over the prop — avoids stale closure when the function is memoized

Neither is worth doing without `React.memo` on `TodoItem` first.

### File List

- `frontend/src/App.tsx` — modified: simplified to use `useTodoMutations`; only rendering logic remains
- `frontend/src/App.test.tsx` — modified: added useUpdateTodo + useDeleteTodo to vi.mock, added 3 new mutation tests
- `frontend/src/components/ErrorBanner.tsx` — created: simple error banner component with message prop
- `frontend/src/components/TodoItem.test.tsx` — modified: added 2 propagation guard tests
- `frontend/src/hooks/useTodoMutations.ts` — created: encapsulates all three mutations and their handlers
- `frontend/src/lib/optimisticMutation.ts` — created: generic `makeOptimisticHandlers` helper
- `frontend/src/lib/optimisticMutation.test.ts` — created: 8 unit tests for makeOptimisticHandlers (snapshot, rollback, invalidation)
- `e2e/tests/complete-delete-todo.spec.ts` — created: 3 E2E tests for toggle and delete flows

### Change Log

- 2026-03-06: Code review fixes applied
  - Added `optimisticMutation.test.ts` with 8 tests covering onMutate/onError/onSettled (H1, H2)
  - Fixed `App.test.tsx`: use `importOriginal` to keep real `getListTodosQueryKey` instead of mocking it (M2)
  - Fixed `App.test.tsx`: added `beforeEach(() => vi.clearAllMocks())` (M1)
  - Fixed `App.test.tsx`: `setQueryData` now uses `getListTodosQueryKey()` instead of hardcoded `["/todos"]` (M2)
  - Fixed `useTodoMutations.ts`: removed unnecessary `as const` on `false` (L2)
  - Fixed `useTodoMutations.ts`: temp ID uses decrementing counter (`nextTempId--`) to avoid collision (L3)
  - Checked off all Architecture Compliance Checklist items (L1)
