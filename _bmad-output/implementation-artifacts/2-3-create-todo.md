# Story 2.3: Create Todo

Status: done

## Story

As a **user**,
I want to type a task and submit it, with it appearing in my list instantly,
so that I can capture tasks immediately without waiting for a server round-trip.

## Acceptance Criteria

1. **Given** the app is open
   **Then** a `TodoForm` is always visible at the bottom of the Active section with placeholder text "Add a task…"
   **And** the input field has focus on page load

2. **Given** the user types text in the input and presses Enter
   **When** the text is non-empty
   **Then** the new todo appears immediately at the bottom of the Active section (optimistic update — before server confirmation)
   **And** the input field clears and refocuses
   **And** `POST /todos` is called in the background to persist the todo

3. **Given** the optimistic create succeeds server-side
   **When** `onSettled` fires
   **Then** the query cache is invalidated and refetched, confirming server state

4. **Given** the user attempts to submit with an empty input field
   **When** Enter is pressed
   **Then** no todo is created and no API call is made
   **And** the input field retains focus

5. **Given** the user types more than 500 characters
   **When** typing in the input
   **Then** the input stops accepting characters at the 500-character limit with no error label shown

## Tasks / Subtasks

- [x] Task 1: Wire up TodoForm with controlled input, submit button, and submit logic (AC: 1, 2, 4, 5)
  - [x] Add `onCreate?: (text: string) => void` prop to `TodoForm`
  - [x] Convert Input to controlled component with local `text` state
  - [x] Add `autoFocus` to the Input element for page load focus
  - [x] Change `TodoRow as="div"` to `as="form"` and add `onSubmit` handler
  - [x] In `onSubmit`: call `e.preventDefault()`, guard `text.trim()`, call `onCreate(text.trim())`, clear input
  - [x] Add `right` slot to `TodoRow`: `Button` (ghost, icon) with `Plus` icon (`h-4 w-4`), `type="submit"`, `aria-label="Add todo"`, `disabled={!hasText}` — always visible, muted when empty
  - [x] `maxLength={500}` already present — no change needed

- [x] Task 2: Add `useCreateTodo` mutation with optimistic update to App.tsx (AC: 2, 3)
  - [x] Import `useQueryClient` from `@tanstack/react-query`
  - [x] Import `useCreateTodo`, `getListTodosQueryKey` from generated API client
  - [x] Import `listTodosResponse` type for typed `setQueryData` call
  - [x] Add `useState<string | null>(null)` for `error` state (used by ErrorBanner in Story 3.1)
  - [x] Set up `useCreateTodo` mutation with `onMutate` / `onError` / `onSettled`:
    - `onMutate`: cancel queries, snapshot, add optimistic `TodoPublic` (temp negative ID) to cache
    - `onError`: restore snapshot, set error state
    - `onSettled`: invalidate query to sync server state
  - [x] Define `handleCreate(text: string)` and pass as `onCreate` prop to `TodoForm`

- [x] Task 3: Update TodoForm tests (AC: 1, 2, 4)
  - [x] Add test: Enter submits and calls `onCreate` when input has value
  - [x] Add test: Enter does NOT call `onCreate` when input is empty
  - [x] Add test: input clears after successful submission
  - [x] Add test: input has `autoFocus` attribute

- [x] Task 4: Update App.tsx tests (AC: 2)
  - [x] Add `useCreateTodo` to the `vi.mock` of generated API module
  - [x] Add test: create mutation integration (mock mutation fires when `onCreate` called)

- [x] Task 5: Lint and verify (all ACs)
  - [x] Run `cd frontend && npx biome check --write .`
  - [x] Run `cd frontend && npx vitest run` — all tests pass
  - [x] Verify in browser: type a task, press Enter — todo appears instantly, input clears

## Dev Notes

### Current State of Codebase

Story 2.2 is complete. The frontend UI layer is fully bootstrapped. Key facts for Story 2.3:

- `TodoForm` (`frontend/src/components/TodoForm.tsx`) is a **visual placeholder only** — the Input is present but nothing handles submit yet
- `App.tsx` renders: `ThemeProvider` > `<main>` > `AppHeader` > `<div>` containing `TodoSection(Completed)` + `TodoSection(Active)` + `TodoForm`
- `TodoForm` is rendered **at the App level** (below `TodoSection`), NOT inside `TodoSection` — this is intentional per architecture
- `useListTodos`, `useCreateTodo`, `getListTodosQueryKey` are all available in `frontend/src/api/generated/todos/todos.ts`

### TodoForm Changes

**Current `TodoForm.tsx`:**
```tsx
export function TodoForm() {
  return (
    <TodoRow
      as="div"
      left={<div className="h-4 w-4 shrink-0 rounded-full border border-[var(--border)] opacity-40" aria-hidden="true" />}
      content={
        <Input type="text" placeholder="Add a task…" aria-label="Add a task" maxLength={500} />
      }
    />
  );
}
```

**Updated `TodoForm.tsx` — native form submit + controlled input + add icon button:**
```tsx
import { Plus } from "lucide-react";
import { useState } from "react";
import { TodoRow } from "@/components/TodoRow";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface TodoFormProps {
  onCreate?: (text: string) => void;
}

export function TodoForm({ onCreate }: TodoFormProps) {
  const [text, setText] = useState("");
  const hasText = text.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasText) {
      onCreate?.(text.trim());
      setText("");
    }
  };

  return (
    <TodoRow
      as="form"
      onSubmit={handleSubmit}
      left={
        <div
          className="h-4 w-4 shrink-0 rounded-full border border-[var(--border)] opacity-40"
          aria-hidden="true"
        />
      }
      content={
        <Input
          type="text"
          placeholder="Add a task…"
          aria-label="Add a task"
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          // biome-ignore lint/a11y/noAutofocus: input should be focused on page load per AC
          autoFocus
        />
      }
      right={
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Add todo"
          disabled={!hasText}
        >
          <Plus className="h-4 w-4 text-[var(--muted-foreground)]" />
        </Button>
      }
    />
  );
}
```

**Key decisions:**
- `TodoRow as="form"` — already supported by `TodoRow`'s `as` prop (`"li" | "div" | "form"`). Native form submit handles Enter automatically, no `onKeyDown` needed.
- `e.preventDefault()` prevents page reload on submit.
- `text.trim()` before calling `onCreate`: rejects whitespace-only input (AC4).
- Input clears via `setText("")` after submit (AC2). Focus is retained automatically.
- `autoFocus` on Input for page load focus (AC1). Biome flags `lint/a11y/noAutofocus` — suppress inline.
- Button always rendered — `disabled={!hasText}` makes it muted (via `disabled:opacity-50 disabled:pointer-events-none` in `Button.tsx`) when empty, active when input has content. This keeps the right column consistently present, aligning with trash icons on `TodoItem` rows.
- `type="submit"` on the button so clicking it triggers the form's `onSubmit` — same path as Enter key, no duplicate logic.
- `Plus` icon (`h-4 w-4`) from lucide-react — already installed in Story 2.2.

**Note: TodoRow `onSubmit` threading**

`TodoRow` currently accepts `onClick` but not `onSubmit`. Two options:
1. Add `onSubmit?: React.FormEventHandler` to `TodoRowProps` and thread it through to `<Tag>`
2. Add a rest-props spread to `TodoRow` so any additional HTML attributes pass through

Option 1 is simpler and more explicit for this use case. Add to `TodoRow.tsx`:
```tsx
interface TodoRowProps {
  as?: "li" | "div" | "form";
  onSubmit?: React.FormEventHandler<HTMLElement>;
  // ... existing props
}
// and spread it: <Tag ... onSubmit={onSubmit}>
```

### App.tsx Changes — Mutation with Optimistic Update

**Add these imports:**
```tsx
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateTodo,
  useListTodos,
  getListTodosQueryKey,
} from "@/api/generated/todos/todos";
import type { listTodosResponse } from "@/api/generated/todos/todos";
```

**Add inside `App` function:**
```tsx
const [error, setError] = useState<string | null>(null);
const queryClient = useQueryClient();

const { mutate: createTodo } = useCreateTodo({
  mutation: {
    onMutate: async ({ data: newTodo }) => {
      await queryClient.cancelQueries({ queryKey: getListTodosQueryKey() });
      const snapshot = queryClient.getQueryData<listTodosResponse>(
        getListTodosQueryKey(),
      );
      queryClient.setQueryData<listTodosResponse>(
        getListTodosQueryKey(),
        (old) => {
          if (!old) return old;
          const optimisticTodo = {
            id: -Date.now(),
            text: newTodo.text,
            is_completed: false as const,
            created_at: new Date().toISOString(),
          };
          return { ...old, data: [...old.data, optimisticTodo] };
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

const handleCreate = (text: string) => {
  createTodo({ data: { text } });
};
```

**Pass `onCreate` to `TodoForm`:**
```tsx
<TodoForm onCreate={handleCreate} />
```

**Note on `error` state:** The `error` state is declared here for use by `ErrorBanner` in Story 3.1. For now it's set but not consumed — Biome may flag an unused variable. Suppress or use `void error` if needed, or just let it be — it'll be consumed in Story 3.1 soon.

### Optimistic Update Data Shape

The TanStack Query cache stores the full Orval response object, not just the array. The shape from `listTodosResponse200`:

```ts
{ data: TodoPublic[], status: 200, headers: Headers }
```

When doing `setQueryData`, spread the old object and replace only `data`:
```ts
return { ...old, data: [...old.data, optimisticTodo] };
```

The temp ID (`-Date.now()`) is negative to avoid collisions with real server IDs (which are positive integers). After `onSettled` invalidates and refetches, the real todo with its real ID replaces the optimistic entry.

### Generated Hook Usage

```ts
// Mutation signature:
useCreateTodo({
  mutation: {
    onMutate: async (variables: { data: TodoCreate }) => { ... },
    onError: (error, variables, context) => { ... },
    onSettled: () => { ... },
  }
})

// Invoke:
const { mutate: createTodo } = useCreateTodo({ mutation: { ... } });
createTodo({ data: { text: "Buy milk" } });
```

`TodoCreate` type:
```ts
interface TodoCreate {
  text: string;       // @minLength 1, @maxLength 500
  is_completed?: boolean;
}
```

### Testing Approach

**`TodoForm.test.tsx` additions — use `@testing-library/user-event`:**
```tsx
import userEvent from "@testing-library/user-event";

it("calls onCreate with trimmed text on submit", async () => {
  const onCreate = vi.fn();
  render(<TodoForm onCreate={onCreate} />);
  const input = screen.getByRole("textbox", { name: "Add a task" });
  await userEvent.type(input, "Buy milk");
  await userEvent.keyboard("{Enter}");
  expect(onCreate).toHaveBeenCalledWith("Buy milk");
});

it("clears input after submission", async () => {
  const onCreate = vi.fn();
  render(<TodoForm onCreate={onCreate} />);
  await userEvent.type(screen.getByRole("textbox", { name: "Add a task" }), "Buy milk");
  await userEvent.keyboard("{Enter}");
  expect(screen.getByRole("textbox", { name: "Add a task" })).toHaveValue("");
});

it("does not call onCreate when input is empty", async () => {
  const onCreate = vi.fn();
  render(<TodoForm onCreate={onCreate} />);
  await userEvent.keyboard("{Enter}");
  expect(onCreate).not.toHaveBeenCalled();
});

it("does not call onCreate for whitespace-only input", async () => {
  const onCreate = vi.fn();
  render(<TodoForm onCreate={onCreate} />);
  await userEvent.type(screen.getByRole("textbox", { name: "Add a task" }), "   ");
  await userEvent.keyboard("{Enter}");
  expect(onCreate).not.toHaveBeenCalled();
});
```

The native form submit means both `{Enter}` in the input and clicking the add button go through the same `handleSubmit`.

```tsx
it("add button is disabled when input is empty", () => {
  render(<TodoForm onCreate={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Add todo" })).toBeDisabled();
});

it("add button is enabled when input has text", async () => {
  render(<TodoForm onCreate={vi.fn()} />);
  await userEvent.type(screen.getByRole("textbox", { name: "Add a task" }), "Buy milk");
  expect(screen.getByRole("button", { name: "Add todo" })).toBeEnabled();
});

it("clicking add button calls onCreate", async () => {
  const onCreate = vi.fn();
  render(<TodoForm onCreate={onCreate} />);
  await userEvent.type(screen.getByRole("textbox", { name: "Add a task" }), "Buy milk");
  await userEvent.click(screen.getByRole("button", { name: "Add todo" }));
  expect(onCreate).toHaveBeenCalledWith("Buy milk");
});
```

**`App.test.tsx` update — extend the mock:**
```tsx
vi.mock("@/api/generated/todos/todos", () => ({
  useListTodos: vi.fn(),
  useCreateTodo: vi.fn(() => ({ mutate: vi.fn() })),
  getListTodosQueryKey: () => ["/todos"],
}));
```

The existing `App.test.tsx` tests should still pass because `useCreateTodo` is now mocked and doesn't actually call the API.

### Project Structure — Files Changed for This Story

```
frontend/src/
├── components/
│   ├── TodoRow.tsx           MODIFIED — add onSubmit prop to TodoRowProps, thread to <Tag>
│   ├── TodoForm.tsx          MODIFIED — add onCreate prop, controlled input, form submit, autoFocus
│   └── TodoForm.test.tsx     MODIFIED — add 4 new tests for submit behavior
├── App.tsx                   MODIFIED — add useCreateTodo mutation, handleCreate, pass onCreate to TodoForm
└── App.test.tsx              MODIFIED — add useCreateTodo to vi.mock
```

No new files. No backend changes. No API regeneration needed (no endpoint changes).

### Architecture Compliance Checklist

- [ ] `@/` import alias used for all cross-directory imports
- [ ] `getListTodosQueryKey()` used for all cache operations — never hardcoded `["/todos"]` or `["/api/todos"]`
- [ ] Optimistic update pattern: `onMutate` / `onError` / `onSettled` all implemented
- [ ] `onMutate` returns `{ snapshot }` for rollback in `onError`
- [ ] `onSettled` always calls `invalidateQueries` regardless of success/error
- [ ] `frontend/src/api/generated/` never edited by hand
- [ ] No API regeneration needed (no backend API changes this story)
- [ ] Error state managed locally in App.tsx (no global error store)
- [ ] `text.trim()` used before calling `onCreate` (rejects whitespace-only, satisfies AC4)
- [ ] Native `<form>` submit used (via `TodoRow as="form"`) — no `onKeyDown` needed
- [ ] `onSubmit` prop added to `TodoRow` and threaded through to `<Tag>`
- [ ] Add button uses `type="submit"` — clicks go through the same `handleSubmit` as Enter, no duplicate logic
- [ ] Add button always rendered, `disabled={!hasText}` — muted when empty, active when has content (per UX spec)
- [ ] Add button `aria-label="Add todo"` matches trash button pattern (`aria-label="Delete todo"`)

### Previous Story Intelligence (Story 2.2)

Key learnings from Story 2.2 that apply here:

- **`is_completed` is `boolean | undefined`** — in the optimistic todo, set `is_completed: false as const` to ensure it goes to the active list (since `active = todos.filter(t => t.is_completed !== true)`)
- **Biome 2.4.6** — run `npx biome check --write .` after all changes. It will catch formatting issues and import ordering. The `autoFocus` prop will trigger `lint/a11y/noAutofocus` — suppress it inline
- **ThemeProvider and useTheme mocked in App.test.tsx** — when adding new tests, keep these mocks in place
- **TodoForm is at App level, NOT inside TodoSection** — pass `onCreate` from App directly to `<TodoForm onCreate={handleCreate} />`
- **`useQueryClient()` requires being inside a `QueryClientProvider`** — App.tsx is already wrapped in `QueryClientProvider` via `main.tsx`, so this works correctly

### Git Intelligence

Recent commits establish:
- `1469524 Todo list view` — completed Story 2.2. All UI components bootstrapped: `TodoForm` (visual placeholder), `TodoItem`, `TodoRow`, `TodoSection`, `AppHeader`, `ThemeProvider`. Tailwind v4 + shadcn/ui installed.
- `b298490 Add typechecking` — pyright added to backend pipeline
- `228c8a6 Add todo model & endpoints` — `useCreateTodo`, `useUpdateTodo`, `useDeleteTodo` hooks already in `frontend/src/api/generated/todos/todos.ts`

This story is purely frontend wiring — no backend changes, no API regeneration.

### References

- Epics: Story 2.3 acceptance criteria [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3]
- Architecture: Optimistic update pattern [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- Architecture: Process patterns — generated API client and query key functions [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns]
- UX: TodoForm component spec [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy]
- UX: Form patterns — submission, empty rejection, post-submit behavior [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Patterns]
- UX: Journey 1: Create a Todo [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 1]
- Story 2.2 completion notes [Source: _bmad-output/implementation-artifacts/2-2-todo-list-view.md#Completion Notes List]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Implemented `TodoForm` with controlled input, `autoFocus`, native form submit via `TodoRow as="form"`, and a `Plus` icon submit button (always visible, disabled when empty).
- Added `onSubmit` prop to `TodoRow` (threaded through to the underlying `<Tag>` element).
- Added `useCreateTodo` mutation to `App.tsx` with full optimistic update pattern: `onMutate` snapshots cache and adds optimistic todo (negative temp ID), `onError` rolls back snapshot, `onSettled` invalidates query.
- `error` state declared in `App.tsx` for use by `ErrorBanner` in Story 3.1.
- Added 8 new `TodoForm` tests (submit, clear, empty guard, whitespace guard, autoFocus, button disabled/enabled, button click).
- Added `useCreateTodo` mock to `App.test.tsx`; wrapped renders in `QueryClientProvider` to satisfy `useQueryClient()`.
- Added 1 e2e test covering create happy path + persistence after reload.
- Retroactively trimmed Story 2.2 e2e tests (`todo-list-view.spec.ts`) to major flows only, per CLAUDE.md conventions (edge cases covered by unit tests).
- All 33 unit tests pass; 6 e2e tests pass; Biome clean.

### File List

frontend/src/components/TodoRow.tsx
frontend/src/components/TodoForm.tsx
frontend/src/components/TodoForm.test.tsx
frontend/src/App.tsx
frontend/src/App.test.tsx
e2e/tests/create-todo.spec.ts
e2e/tests/todo-list-view.spec.ts

## Change Log

- 2026-03-06: Implemented Story 2.3 — TodoForm wired with controlled input, native form submit, autoFocus, optimistic create mutation in App.tsx, 8 new TodoForm tests, QueryClientProvider wrapper in App.test.tsx, 1 e2e test (create happy path + persistence). Retroactively trimmed Story 2.2 e2e tests to major flows per CLAUDE.md conventions.
- 2026-03-06: Code review fixes — Added create mutation integration test to App.test.tsx, added input refocus test to TodoForm.test.tsx, fixed TodoRow onSubmit prop to only pass through when as="form". 33 unit tests pass.
