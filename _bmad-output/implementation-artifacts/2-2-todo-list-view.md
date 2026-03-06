# Story 2.2: Todo List View

Status: done

## Story

As a **user**,
I want to see my full todo list when I open the app, with active and completed todos visually distinct and timestamps shown per item,
so that I can immediately review my current tasks and their completion state.

## Acceptance Criteria

1. **Given** the app loads
   **When** the frontend fetches `GET /todos` via the Orval-generated TanStack Query hook
   **Then** all todos are rendered: completed todos in a "Completed" section at the top, active todos in an "Active" section below

2. **Given** a completed todo
   **When** it renders in the Completed section
   **Then** its text has strikethrough styling and is visually dimmed (muted color)
   **And** its checkbox is in a checked state

3. **Given** an active todo
   **When** it renders in the Active section
   **Then** its text has no strikethrough and uses primary text color
   **And** its checkbox is in an unchecked state

4. **Given** each todo item
   **When** it renders
   **Then** the creation timestamp is visible below the todo text in secondary (muted) color, formatted as a readable date/time
   **And** the timestamp uses a `<time dateTime="...">` element

5. **Given** no todos exist in the database
   **When** the app loads
   **Then** neither the "Completed" nor "Active" section labels are visible
   **And** the `TodoForm` is the only element in the list area

6. **Given** todos exist but none are completed
   **When** the app renders
   **Then** the "Completed" section label does not render
   **And** only the "Active" section with its todos is visible

7. **Given** todos exist but all are completed
   **When** the app renders
   **Then** the "Active" section label does not render (only `TodoForm` remains in the active area)

8. **Given** a page reload with existing todos in the database
   **When** the app loads
   **Then** all todos appear in their correct state (text, completion, timestamp)

## Tasks / Subtasks

- [x] Task 1: Install and configure Tailwind CSS v4 + shadcn/ui (AC: all — visual foundation)
  - [x] Install `tailwindcss` v4, `@tailwindcss/vite` plugin
  - [x] Install shadcn/ui dependencies: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`
  - [x] Install Radix UI: `@radix-ui/react-checkbox`, `@radix-ui/react-slot`
  - [x] Replace `frontend/src/index.css` with Tailwind v4 directives + shadcn/ui CSS custom properties (light/dark tokens)
  - [x] Update `vite.config.ts` to use `@tailwindcss/vite` plugin
  - [x] Add `frontend/src/lib/utils.ts` with `cn()` helper (clsx + tailwind-merge)
  - [x] Add shadcn/ui components: `Checkbox`, `Button`, `Input`, `Skeleton` to `frontend/src/components/ui/`

- [x] Task 2: Add QueryClientProvider to app entry (AC: 1 — data fetching prerequisite)
  - [x] Update `frontend/src/main.tsx` to wrap `<App>` in `<QueryClientProvider client={queryClient}>`
  - [x] Verify `@tanstack/react-query` is already in `package.json` (it is — no install needed)

- [x] Task 3: Create ThemeProvider and useTheme hook (AC: visual foundation)
  - [x] Create `frontend/src/hooks/useTheme.ts` — reads `prefers-color-scheme`, checks `localStorage`, returns `theme` + `toggleTheme`
  - [x] Create `frontend/src/components/ThemeProvider.tsx` — applies `dark` class to `<html>`, exposes context

- [x] Task 4: Create AppHeader component (AC: structural)
  - [x] Create `frontend/src/components/AppHeader.tsx` — "My Tasks" title + ghost icon-only theme toggle button (sun/moon, 18px)
  - [x] `aria-label` on toggle: "Switch to dark mode" / "Switch to light mode" (dynamic)
  - [x] Create `frontend/src/components/AppHeader.test.tsx` — renders title, renders toggle button with correct aria-label

- [x] Task 5: Create TodoRow layout primitive (AC: 2, 3, 4)
  - [x] Create `frontend/src/components/TodoRow.tsx` — flex row with `left`, `content`, `right` slots
  - [x] Styles: `min-h-[44px] py-3 px-4 gap-3 items-center flex`, hover tint
  - [x] Create `frontend/src/components/TodoRow.test.tsx` — renders slot content

- [x] Task 6: Create TodoForm (visual placeholder for this story) (AC: 5, 7)
  - [x] Create `frontend/src/components/TodoForm.tsx` — composes `TodoRow` with faded Checkbox (opacity-40, non-interactive) + `Input` (placeholder "Add a task…", `aria-label="Add a task"`)
  - [x] No `onSubmit` wired yet — that is Story 2.3. Input can be present and focusable but submission not connected.
  - [x] Create `frontend/src/components/TodoForm.test.tsx` — renders input with correct aria-label and placeholder

- [x] Task 7: Create TodoItem component (AC: 2, 3, 4)
  - [x] Create `frontend/src/components/TodoItem.tsx` — composes `TodoRow`:
    - Left slot: `Checkbox` (checked=`is_completed`, `aria-label="Mark as complete"` / `"Mark as active"`, non-functional for now — handlers wired in Story 2.4)
    - Content slot: todo text (`line-through` + muted color if completed) + `<time dateTime={created_at}>` timestamp in `text-xs` secondary color
    - Right slot: ghost `Button` with trash icon (`aria-label="Delete todo"`, non-functional for now — wired in Story 2.4)
  - [x] Create `frontend/src/components/TodoItem.test.tsx` — active todo renders without strikethrough, completed todo renders with strikethrough + dimmed, timestamp uses `<time>` element

- [x] Task 8: Create TodoSection component (AC: 1, 5, 6, 7)
  - [x] Create `frontend/src/components/TodoSection.tsx` — section label (`text-xs font-medium uppercase tracking-wide`) + list of `TodoItem`s (rendered as `<ul>/<li>`)
  - [x] Renders only when it has items (conditional section label)
  - [x] Active section always includes `TodoForm` as last child
  - [x] Props: `label`, `todos`, `onToggle` (no-op for now), `onDelete` (no-op for now)
  - [x] Create `frontend/src/components/TodoSection.test.tsx` — section label hidden when no items, renders items, active section always has input row

- [x] Task 9: Replace App.tsx with full todo list composition (AC: 1–8)
  - [x] Replace `frontend/src/App.tsx` completely — remove Vite template code
  - [x] Use `useListTodos()` hook to fetch todos
  - [x] Split todos into `completed` (is_completed=true) and `active` (is_completed=false) arrays
  - [x] Render: `ThemeProvider` > `<main>` (`max-w-2xl mx-auto px-4`) > `AppHeader` > `TodoSection(Completed)` > `TodoSection(Active, always includes TodoForm)`
  - [x] Manage `error` state (set to null for now — `ErrorBanner` wired in Story 3.1)
  - [x] Update `frontend/src/App.test.tsx` — renders "My Tasks" header, renders completed and active sections, empty state shows only input row

- [x] Task 10: Clean up Vite template files and run verification
  - [x] Delete `frontend/src/App.css` (replaced by Tailwind)
  - [x] Delete `frontend/src/assets/react.svg` if no longer used
  - [x] Run `cd frontend && npx biome check --write .`
  - [x] Run `cd frontend && npx vitest run` — all tests pass
  - [x] Verify app renders in browser via `docker compose up` (or check `http://localhost`)

## Dev Notes

### Critical: Frontend Has NOT Been Set Up for Feature Work Yet

The current `App.tsx` is the unmodified **Vite template** (counter button, Vite/React logos). The following do NOT exist yet and must be created/replaced:
- Tailwind CSS and shadcn/ui — not installed (not in `package.json`)
- `frontend/src/components/` directory — does not exist
- `frontend/src/hooks/` directory — does not exist
- `frontend/src/lib/` directory — does not exist
- `QueryClientProvider` — not in `main.tsx` yet
- CSS tokens for light/dark — only default Vite CSS in `index.css`

Story 2.2 must bootstrap the entire frontend UI layer before it can render any todo data.

### Tailwind v4 Setup (Required — New Approach vs v3)

The project uses **Vite 7** and **Tailwind v4** (released early 2025). Tailwind v4 uses a Vite plugin instead of PostCSS, and requires NO `tailwind.config.js`.

**Install:**
```bash
cd frontend
npm install tailwindcss @tailwindcss/vite
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install @radix-ui/react-checkbox @radix-ui/react-slot
```

**Update `vite.config.ts`:**
```ts
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    globals: true,
  },
});
```

**Replace `frontend/src/index.css`** with Tailwind v4 import + shadcn/ui CSS custom properties:
```css
@import "tailwindcss";

@layer base {
  :root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.09 0.005 286);
    --muted: oklch(0.96 0.002 286);
    --muted-foreground: oklch(0.47 0.008 286);
    --border: oklch(0.90 0.003 286);
    --input: oklch(0.90 0.003 286);
    --destructive: oklch(0.58 0.22 25);
  }

  .dark {
    --background: oklch(0.09 0.005 286);
    --foreground: oklch(0.98 0.002 286);
    --muted: oklch(0.14 0.004 286);
    --muted-foreground: oklch(0.47 0.008 286);
    --border: oklch(0.21 0.006 286);
    --input: oklch(0.21 0.006 286);
    --destructive: oklch(0.58 0.22 25);
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    margin: 0;
    min-height: 100vh;
  }
}
```

**Note:** In Tailwind v4, custom CSS properties declared in `:root` / `.dark` are available as Tailwind utility classes via the `--` prefix (e.g., `bg-(--background)`) or as `bg-background` if configured. The simpler approach is to use direct CSS variables in components and rely on standard Tailwind utilities for layout/spacing.

### shadcn/ui Components — Inline Implementation

Since shadcn/ui CLI may not work easily in the Docker setup, create these components manually from the shadcn/ui source. These are simple wrappers around Radix UI:

**`frontend/src/lib/utils.ts`:**
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**`frontend/src/components/ui/Checkbox.tsx`** — thin wrapper around `@radix-ui/react-checkbox`:
```tsx
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: CheckboxPrimitive.CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "h-4 w-4 shrink-0 rounded-full border border-[var(--border)] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--foreground)] data-[state=checked]:text-[var(--background)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="h-3 w-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
```

**`frontend/src/components/ui/Button.tsx`** — simple button with ghost variant:
```tsx
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "ghost";
  size?: "icon";
}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variant === "ghost" && "hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
        size === "icon" && "h-9 w-9",
        className
      )}
      {...props}
    />
  );
}
```

**`frontend/src/components/ui/Input.tsx`:**
```tsx
import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex w-full rounded-md bg-transparent text-sm placeholder:text-[var(--muted-foreground)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
```

**`frontend/src/components/ui/Skeleton.tsx`:**
```tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--muted)]", className)}
      {...props}
    />
  );
}
```

### QueryClientProvider Setup

**Update `frontend/src/main.tsx`:**
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

// biome-ignore lint/style/noNonNullAssertion: root element is guaranteed to exist in index.html
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

### ThemeProvider and useTheme Hook

**`frontend/src/hooks/useTheme.ts`:**
```ts
import { useContext } from "react";
import { ThemeContext } from "@/components/ThemeProvider";

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
```

**`frontend/src/components/ThemeProvider.tsx`:**
```tsx
import { createContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### App.tsx — Full Replacement

```tsx
import { useListTodos } from "@/api/generated/todos/todos";
import { AppHeader } from "@/components/AppHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TodoSection } from "@/components/TodoSection";

function App() {
  const { data: todosResponse, isError } = useListTodos();
  const todos = todosResponse?.data ?? [];

  const completed = todos.filter((t) => t.is_completed);
  const active = todos.filter((t) => !t.is_completed);

  // ErrorBanner wired in Story 3.1 — isError available here when needed
  void isError;

  return (
    <ThemeProvider>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <AppHeader />
        <ul className="mt-4 divide-y divide-[var(--border)]">
          <TodoSection label="Completed" todos={completed} />
          <TodoSection label="Active" todos={active} isActiveSection />
        </ul>
      </main>
    </ThemeProvider>
  );
}

export default App;
```

### Orval-generated Hook: useListTodos

The hook is already generated at `frontend/src/api/generated/todos/todos.ts`. Key facts:
- Returns `{ data: listTodosResponse, status, isPending, isError, ... }`
- `data.data` is the `TodoPublic[]` array (response wrapper pattern from Orval)
- Query key: `getListTodosQueryKey()` → `["/todos"]`
- **Always use `getListTodosQueryKey()`** for cache operations — never hardcode `["/todos"]`

**Type shapes:**
```ts
interface TodoPublic {
  id: number;
  text: string;
  is_completed?: boolean;  // undefined = false (treat as active)
  created_at: string;      // ISO 8601 datetime string
}
```

**Note:** `is_completed` is optional (may be `undefined` when false). Treat `undefined` as `false`.

### TodoRow Layout Primitive

```tsx
// frontend/src/components/TodoRow.tsx
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface TodoRowProps {
  left: ReactNode;
  content: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function TodoRow({ left, content, right, onClick, className }: TodoRowProps) {
  return (
    <li
      className={cn(
        "flex min-h-[44px] items-center gap-3 py-3 px-4",
        onClick && "cursor-pointer hover:bg-[var(--muted)] transition-colors",
        className
      )}
      onClick={onClick}
    >
      <div className="flex-shrink-0">{left}</div>
      <div className="flex-1 min-w-0">{content}</div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </li>
  );
}
```

### TodoItem Component

```tsx
// frontend/src/components/TodoItem.tsx
import type { TodoPublic } from "@/api/generated/todoBmadAPI.schemas";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { TodoRow } from "@/components/TodoRow";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodoItemProps {
  todo: TodoPublic;
  onToggle?: (id: number) => void;   // no-op for now, wired in Story 2.4
  onDelete?: (id: number) => void;   // no-op for now, wired in Story 2.4
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const isCompleted = todo.is_completed === true;
  const formattedDate = new Date(todo.created_at).toLocaleString();

  return (
    <TodoRow
      onClick={() => onToggle?.(todo.id)}
      left={
        <Checkbox
          checked={isCompleted}
          aria-label={isCompleted ? "Mark as active" : "Mark as complete"}
          onCheckedChange={() => onToggle?.(todo.id)}
          onClick={(e) => e.stopPropagation()}
        />
      }
      content={
        <div>
          <p className={cn("text-sm", isCompleted && "line-through text-[var(--muted-foreground)]")}>
            {todo.text}
          </p>
          <time
            dateTime={todo.created_at}
            className="text-xs text-[var(--muted-foreground)]"
          >
            {formattedDate}
          </time>
        </div>
      }
      right={
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete todo"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(todo.id);
          }}
        >
          <Trash2 className="h-4 w-4 text-[var(--muted-foreground)] hover:text-[var(--destructive)]" />
        </Button>
      }
    />
  );
}
```

### TodoForm Component (Visual Placeholder for Story 2.2)

The `TodoForm` is rendered as a persistent visual element. Submission is wired in Story 2.3.

```tsx
// frontend/src/components/TodoForm.tsx
import { Input } from "@/components/ui/Input";
import { TodoRow } from "@/components/TodoRow";

export function TodoForm() {
  return (
    <TodoRow
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
        />
      }
    />
  );
}
```

### TodoSection Component

```tsx
// frontend/src/components/TodoSection.tsx
import type { TodoPublic } from "@/api/generated/todoBmadAPI.schemas";
import { TodoForm } from "@/components/TodoForm";
import { TodoItem } from "@/components/TodoItem";

interface TodoSectionProps {
  label: string;
  todos: TodoPublic[];
  isActiveSection?: boolean;
  onToggle?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function TodoSection({ label, todos, isActiveSection, onToggle, onDelete }: TodoSectionProps) {
  const hasItems = todos.length > 0;

  // Don't render section at all if no items AND not the active section
  if (!hasItems && !isActiveSection) return null;

  return (
    <div>
      {hasItems && (
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)] px-4 pt-4 pb-1">
          {label}
        </p>
      )}
      <ul>
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
        ))}
        {isActiveSection && <TodoForm />}
      </ul>
    </div>
  );
}
```

### Timestamp Formatting

The backend returns `created_at` as an ISO 8601 string (e.g., `"2026-03-06T10:30:00"`). Format it using `toLocaleString()`:

```ts
const formattedDate = new Date(todo.created_at).toLocaleString();
// e.g., "3/6/2026, 10:30:00 AM"
```

The `<time>` element uses the raw ISO string for `dateTime` (machine-readable) and the formatted string as display text.

### Project Structure — New Files for This Story

```
frontend/
├── src/
│   ├── api/
│   │   └── generated/                     # UNCHANGED — never edit by hand
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx                  # NEW
│   │   │   ├── Checkbox.tsx                # NEW
│   │   │   ├── Input.tsx                   # NEW
│   │   │   └── Skeleton.tsx                # NEW (used in Story 3.1)
│   │   ├── AppHeader.tsx                   # NEW
│   │   ├── AppHeader.test.tsx              # NEW
│   │   ├── ErrorBanner.tsx                 # DEFER to Story 3.1
│   │   ├── ThemeProvider.tsx               # NEW
│   │   ├── TodoForm.tsx                # NEW (visual only — submit wired in 2.3)
│   │   ├── TodoForm.test.tsx           # NEW
│   │   ├── TodoItem.tsx                    # NEW
│   │   ├── TodoItem.test.tsx               # NEW
│   │   ├── TodoRow.tsx                     # NEW
│   │   ├── TodoRow.test.tsx                # NEW
│   │   ├── TodoSection.tsx                 # NEW
│   │   └── TodoSection.test.tsx            # NEW
│   ├── hooks/
│   │   └── useTheme.ts                     # NEW
│   ├── lib/
│   │   └── utils.ts                        # NEW — cn() helper
│   ├── App.tsx                             # REPLACED (remove Vite template code entirely)
│   ├── App.test.tsx                        # REPLACED (remove Vite template test)
│   ├── main.tsx                            # MODIFIED — add QueryClientProvider
│   └── index.css                           # REPLACED — Tailwind v4 + shadcn/ui tokens
├── vite.config.ts                          # MODIFIED — add @tailwindcss/vite plugin
└── package.json                            # MODIFIED — new npm dependencies
```

**Files to DELETE (Vite template remnants):**
- `frontend/src/App.css` — replaced by Tailwind
- `frontend/src/assets/react.svg` — no longer needed
- `frontend/public/vite.svg` — no longer needed (optional, not harmful to keep)

### Testing Approach

**Vitest + @testing-library/react** — already configured (`vite.config.ts` has `test.environment: "jsdom"`, `test-setup.ts` exists).

For components using Radix UI (Checkbox) — use `@testing-library/user-event` for interactions. For rendering-only assertions, `render()` + `screen` is sufficient.

**Key test cases for this story:**
```ts
// App.test.tsx — integration style
- "renders 'My Tasks' header"
- "renders completed section when completed todos exist"
- "renders active section when active todos exist"
- "does not render Completed section when no completed todos"
- "shows only TodoForm when no todos (empty state)"

// TodoItem.test.tsx
- "renders todo text"
- "renders strikethrough for completed todo"
- "renders timestamp in <time> element with dateTime attribute"
- "renders checkbox as checked for completed todo"
- "renders checkbox as unchecked for active todo"

// TodoSection.test.tsx
- "renders section label when items exist"
- "does not render section when no items (non-active section)"
- "always renders TodoForm in active section even when empty"

// TodoForm.test.tsx
- "renders input with aria-label 'Add a task'"
- "renders input with placeholder 'Add a task…'"
```

**Mocking `useListTodos` in App.test.tsx:**
```ts
vi.mock("@/api/generated/todos/todos", () => ({
  useListTodos: vi.fn(),
  getListTodosQueryKey: () => ["/todos"],
}));
```

### Previous Story Learnings (Story 2.1)

- **`created_at` is ISO datetime string** — `sa.func.now()` on PostgreSQL. In tests with SQLite it may differ slightly, but the API always returns a parseable ISO string.
- **`is_completed` defaults to false but type is `boolean | undefined`** — always check `=== true` not just truthy to handle undefined correctly.
- **Biome 2.4.6** — run `npx biome check --write .` after all component creation. Biome enforces import organization and formatting. The `frontend/src/api/generated/` is excluded in `biome.json`.
- **Ruff**: no backend changes this story — no ruff run needed.
- **`greenlet` is a prod dependency** on backend — no frontend impact.
- **Orval freshness**: No new backend endpoints this story, so no need to regenerate the API client. The existing generated client is correct.

### Git Intelligence (Recent Commits)

The last commit (`228c8a6 Add todo model & endpoints`) established:
- Backend: `models.py`, `database.py`, `routes/todos.py`, migrations, tests
- Frontend: `src/api/generated/` with `useListTodos`, `useCreateTodo`, `useUpdateTodo`, `useDeleteTodo` hooks already generated and committed

This story is the first purely frontend story — no backend changes.

### Architecture Compliance Checklist

- [ ] `@/` import alias used for all cross-directory imports (never `../../`)
- [ ] `PascalCase` for all React component files
- [ ] `camelCase` for non-component TS files (`useTheme.ts`, `utils.ts`)
- [ ] `getListTodosQueryKey()` used for any future cache operations (not hardcoded strings)
- [ ] `frontend/src/api/generated/` never edited by hand
- [ ] Semantic HTML: `<main>`, `<ul>`, `<li>` for list structure
- [ ] All interactive elements have `aria-label`
- [ ] Timestamps use `<time dateTime="...">` element
- [ ] All interactive elements ≥ 44×44px touch target (enforced by `min-h-[44px]` on `TodoRow`)
- [ ] No fixed pixel widths except icons
- [ ] `max-w-2xl mx-auto px-4` on root container

### References

- Architecture: Frontend component tree [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Component Boundary]
- Architecture: Optimistic update pattern [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- Architecture: Naming conventions [Source: _bmad-output/planning-artifacts/architecture.md#Naming Conventions]
- Architecture: Complete project directory structure [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- Architecture: `@/` import alias [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns]
- UX: Component specs (TodoRow, TodoItem, TodoForm, TodoSection, AppHeader, ThemeProvider) [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy]
- UX: Color tokens (light/dark) [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Color System]
- UX: Typography scale [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Typography System]
- UX: Accessibility requirements (aria-labels, time element, 44px targets) [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Strategy]
- UX: Section conditional rendering [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Empty State Patterns]
- Epics: Story 2.2 acceptance criteria [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2]
- Story 2.1 completion notes [Source: _bmad-output/implementation-artifacts/2-1-backend-todo-api-database.md#Completion Notes List]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Installed Tailwind CSS v4 with `@tailwindcss/vite` plugin (no PostCSS/tailwind.config.js needed)
- Installed shadcn/ui deps: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-checkbox`, `@radix-ui/react-slot`
- Created all UI components inline (Checkbox, Button, Input, Skeleton) as per Dev Notes
- Added `QueryClientProvider` wrap in `main.tsx`
- Created `ThemeProvider` + `useTheme` hook for light/dark toggle; localStorage used for persistence
- Created `AppHeader` with dynamic sun/moon icon and accessible `aria-label`
- Created `TodoRow` layout primitive with keyboard accessibility (`onKeyDown` for Enter/Space)
- Created `TodoForm` as visual placeholder (submit wired in Story 2.3)
- Created `TodoItem` with conditional strikethrough, `<time dateTime>` element, Checkbox, and delete Button
- Created `TodoSection` with conditional label rendering
- `TodoForm` rendered at App level, not inside `TodoSection` — cleaner separation of concerns
- Replaced `App.tsx` entirely — fetches todos via `useListTodos()`, splits into completed/active arrays
- Deleted Vite template remnants: `App.css`, `assets/react.svg`, `public/vite.svg`
- Enabled `tailwindDirectives` in `biome.json` to support `@apply` in CSS
- All 23 unit tests pass; Biome linting clean; TypeScript type check clean
- `App.test.tsx` mocks `ThemeProvider` and `useTheme` to avoid `localStorage` jsdom issue

### File List

frontend/package.json
frontend/package-lock.json
frontend/vite.config.ts
frontend/biome.json
frontend/orval.config.ts
frontend/src/index.css
frontend/src/main.tsx
frontend/src/App.tsx
frontend/src/App.test.tsx
frontend/src/App.css (DELETED)
frontend/src/assets/react.svg (DELETED)
frontend/public/vite.svg (DELETED)
frontend/src/api/generated/todos/todos.ts
frontend/src/lib/utils.ts
frontend/src/hooks/useTheme.ts
frontend/src/components/ThemeProvider.tsx
frontend/src/components/AppHeader.tsx
frontend/src/components/AppHeader.test.tsx
frontend/src/components/TodoRow.tsx
frontend/src/components/TodoRow.test.tsx
frontend/src/components/TodoForm.tsx
frontend/src/components/TodoForm.test.tsx
frontend/src/components/TodoItem.tsx
frontend/src/components/TodoItem.test.tsx
frontend/src/components/TodoSection.tsx
frontend/src/components/TodoSection.test.tsx
frontend/src/components/ui/Button.tsx
frontend/src/components/ui/Checkbox.tsx
frontend/src/components/ui/Input.tsx
frontend/src/components/ui/Skeleton.tsx
e2e/tests/todo-list-view.spec.ts
.gitignore


## Change Log

- 2026-03-06: Implemented Story 2.2 — bootstrapped entire frontend UI layer: Tailwind v4, shadcn/ui components, ThemeProvider, AppHeader, TodoRow, TodoItem, TodoForm, TodoSection, App.tsx replacement. 22 unit tests added. Vite template remnants removed.
- 2026-03-06: Code review fixes — H1: Fixed invalid HTML nesting (`<div>` child of `<ul>` in App.tsx, changed to `<div>` container). H2: Added `role="button"` and `tabIndex={0}` to TodoRow when clickable for keyboard accessibility. M4: Added localStorage theme validation in ThemeProvider. M3: Added `test-results/` to .gitignore. L1: Removed `void isError` pattern. Updated File List with missing files (orval.config.ts, generated API client, e2e test, .gitignore).
- 2026-03-06: Code review #2 fixes — Renamed `TodoItemRow` → `TodoItem` (aligns with architecture/UX spec naming). Renamed `TodoInputRow` → `TodoForm` (better describes form semantics for Story 2.3). Fixed Biome formatting in TodoSection.test.tsx. Fixed invalid HTML in test wrappers (TodoForm, TodoSection tests). Added missing AC7 unit test in App.test.tsx. Updated all planning artifacts (architecture.md, ux-design-specification.md, epics.md) to reflect `TodoForm` naming and `TodoForm` placement at App level instead of inside TodoSection. Corrected test count in Completion Notes (23, not 24).
