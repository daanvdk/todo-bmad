# Story 3.3: Theme Toggle & Accessibility

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want the app to match my system color scheme preference with a manual override, and be fully usable with keyboard and screen readers,
so that the app feels at home on my device and is accessible to all users.

## Acceptance Criteria

1. **Given** a user's OS is set to dark mode (`prefers-color-scheme: dark`)
   **When** the app loads for the first time (no localStorage override)
   **Then** the app renders in dark mode using the dark color tokens

2. **Given** a user's OS is set to light mode
   **When** the app loads for the first time
   **Then** the app renders in light mode

3. **Given** the user clicks/taps the theme toggle in the `AppHeader`
   **When** toggled
   **Then** the theme switches immediately (light ↔ dark)
   **And** the preference is saved to `localStorage`
   **And** subsequent page loads use the `localStorage` value, overriding system preference

4. **Given** the theme toggle button
   **Then** it has a dynamic `aria-label`: "Switch to dark mode" in light mode, "Switch to light mode" in dark mode

5. **Given** any interactive element (theme toggle, checkboxes in TodoItem and TodoForm, delete button, submit/add button)
   **When** the user hovers over it with a pointing device
   **Then** the cursor changes to `cursor: pointer`

6. **Given** all interactive elements in the app
   **When** navigated via keyboard (Tab / Shift+Tab)
   **Then** all elements are reachable in a logical order with no keyboard traps
   **And** all elements show a visible focus ring

7. **Given** the checkbox on a todo item
   **Then** it has `aria-label="Mark as complete"` when unchecked and `aria-label="Mark as active"` when checked
   **And** Space key toggles it (Radix UI native behavior)

8. **Given** an unselected checkbox in TodoItem
   **When** rendered in either light or dark mode
   **Then** the checkbox border is clearly visible with sufficient contrast against its background (WCAG AA minimum: 3:1 for UI components)

9. **Given** the placeholder checkbox in TodoForm
   **When** rendered in either light or dark mode
   **Then** the checkbox border remains clearly visible and the element's opacity styling does not reduce border contrast below WCAG AA threshold

10. **Given** the trash icon button on a todo item
    **Then** it has `aria-label="Delete todo"`

11. **Given** the `TodoForm` input
    **Then** it has `aria-label="Add a task"`

12. **Given** the list structure in the DOM
    **Then** semantic HTML is used: `<main>`, `<header>`, `<ul>`, `<li>` for todos

13. **Given** all text/background color combinations
    **Then** contrast ratios meet WCAG AA (4.5:1 for body text, 3:1 for UI components)

14. **Given** the OS has reduced motion enabled (`prefers-reduced-motion: reduce`)
    **When** the checkbox animation or any row transition fires
    **Then** animations are disabled or reduced to an instant state change

## Tasks / Subtasks

- [x] Task 1: Add `cursor-pointer` to `Button.tsx` (AC: 5)
  - [x] Add `cursor-pointer` to the base `className` string in `Button.tsx`

- [x] Task 2: Add `cursor-pointer` to `Checkbox.tsx` (AC: 5)
  - [x] Add `cursor-pointer` to the `CheckboxPrimitive.Root` className in `Checkbox.tsx`

- [x] Task 3: Fix checkbox border contrast for WCAG AA 3:1 (AC: 8, 9)
  - [x] Add `--checkbox-border` CSS variable to `index.css`: light mode `oklch(0.55 0.003 286)`, dark mode `oklch(0.5 0.006 286)`
  - [x] Update `Checkbox.tsx` to use `border-[var(--checkbox-border)]` instead of `border-[var(--border)]`
  - [x] Fix `TodoForm.tsx` placeholder checkbox: removed `opacity-40` and use `border-[var(--checkbox-border)]`

- [x] Task 4: Add `prefers-reduced-motion` support to `index.css` (AC: 14)
  - [x] Add `@media (prefers-reduced-motion: reduce)` block that sets `transition: none` on all elements

- [x] Task 5: Write unit tests for `useTheme` hook (AC: 1, 2, 3)
  - [x] Create `frontend/src/hooks/useTheme.test.ts`
  - [x] Test: system dark preference sets initial theme to dark
  - [x] Test: system light preference sets initial theme to light
  - [x] Test: localStorage override takes precedence over system preference
  - [x] Test: `toggleTheme` switches theme and updates localStorage

- [x] Task 6: Write E2E tests in `e2e/tests/theme-accessibility.spec.ts` (AC: 3, 4, 5, 6, 8, 14)
  - [x] Test: theme toggle switches dark ↔ light and persists across reload
  - [x] Test: theme toggle aria-label is dynamic ("Switch to dark mode" / "Switch to light mode")
  - [x] Test: all interactive elements have `cursor-pointer` (verify with `getComputedStyle`)
  - [x] Test: all interactive elements are reachable via Tab key in logical order
  - [x] Test: all interactive elements show a visible focus ring
  - [x] Test: checkbox border contrast at reduced opacity is visible (use Playwright screenshot/assertion)

- [x] Task 7: Lint, verify all three test layers pass (all ACs)
  - [x] `cd frontend && npx biome check --write .`
  - [x] `cd frontend && npx vitest run`
  - [x] `cd e2e && npx playwright test`

## Dev Notes

### Current State of Codebase (After Story 3.2)

Story 3.2 (Responsive Layout) is done. Here is the exact state of each relevant file going into Story 3.3:

#### ✅ Already Implemented

**`ThemeProvider.tsx` — theme system complete:**
```tsx
// frontend/src/components/ThemeProvider.tsx
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    const initial: Theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    applyTheme(initial);
    return initial;
  });
  // toggleTheme updates state + calls applyTheme + persists to localStorage
}
```
ACs 1, 2, 3 are FULLY DONE. No changes needed to `ThemeProvider.tsx`.

**`AppHeader.tsx` — dynamic aria-label complete:**
```tsx
<Button
  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
  onClick={toggleTheme}
>
```
AC 4 is FULLY DONE. No changes needed to `AppHeader.tsx`.

**`TodoItem.tsx` — checkbox aria-labels complete:**
```tsx
<Checkbox
  checked={isCompleted}
  aria-label={isCompleted ? "Mark as active" : "Mark as complete"}
/>
// Delete button: aria-label="Delete todo"
```
ACs 7, 10 are FULLY DONE.

**`TodoForm.tsx` — input aria-label complete:**
```tsx
<Input aria-label="Add a task" />
// Add button: aria-label="Add todo"
```
AC 11 is FULLY DONE.

**`TodoRow.tsx` — cursor-pointer for rows complete:**
```tsx
onClick && "cursor-pointer hover:bg-[var(--muted)] transition-colors"
```
The row-level cursor-pointer is done. The gap is the Button component and Checkbox component.

**Semantic HTML — complete:**
`App.tsx` uses `<main>`, `AppHeader` uses `<header>`, TodoSection renders `<ul>`, TodoItem renders as `<li>` via TodoRow. AC 12 is FULLY DONE.

---

#### ❌ Not Yet Implemented

**`Button.tsx` — missing `cursor-pointer`:**
```tsx
// Current (line 14):
"inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
// Missing: cursor-pointer
```
The `disabled:pointer-events-none` prevents the cursor on disabled state, but enabled buttons need explicit `cursor-pointer`.

**`Checkbox.tsx` — missing `cursor-pointer`:**
```tsx
// Radix UI CheckboxPrimitive.Root does NOT add cursor-pointer automatically
// Current className has no cursor-pointer
```

**`index.css` — missing `prefers-reduced-motion` and `--checkbox-border`:**
```css
/* Current — ends at line 37 */
/* Missing: --checkbox-border variable with WCAG AA-compliant values */
/* Missing: @media (prefers-reduced-motion: reduce) { * { transition: none } } */
```

**`Checkbox.tsx` — border fails WCAG AA 3:1 contrast:**
```tsx
// Current: border-[var(--border)]
// --border light: oklch(0.9 0.003 286) ≈ luminance 0.73 → contrast vs white = ~1.35:1 ✗
// --border dark: oklch(0.21 0.006 286) ≈ luminance 0.009 → contrast vs dark bg = ~1.17:1 ✗
// Both fail the 3:1 requirement for UI components (WCAG 1.4.11)
```

**`TodoForm.tsx` — placeholder checkbox `opacity-40` too low:**
```tsx
// Current:
<div className="h-4 w-4 shrink-0 rounded-full border border-[var(--border)] opacity-40" aria-hidden="true" />
// opacity-40 blends toward background too aggressively — even with a dark border,
// opacity < 0.55 against white background cannot achieve 3:1 contrast.
```

---

### Implementation Details

#### Task 1: `cursor-pointer` on Button

Single addition in `frontend/src/components/ui/Button.tsx`:
```tsx
// Change line 14 from:
"inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
// To:
"inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
```
`cursor-pointer` is placed before `disabled:pointer-events-none` which overrides it for disabled state.

#### Task 2: `cursor-pointer` on Checkbox

Addition in `frontend/src/components/ui/Checkbox.tsx`:
```tsx
// Add cursor-pointer to the className string:
"cursor-pointer relative before:absolute before:inset-[-14px] before:content-[''] h-4 w-4 ..."
```

#### Task 3: Checkbox border contrast fix

The current `--border` color is too light in light mode (`oklch(0.9)` ≈ contrast 1.35:1 vs white) and too dark in dark mode (`oklch(0.21)` ≈ contrast 1.17:1 vs dark bg). WCAG 1.4.11 requires 3:1 for UI components. Introduce a dedicated `--checkbox-border` variable with compliant values.

**Step 3a: Add `--checkbox-border` to `index.css`** (insert into each theme block):
```css
:root {
  /* existing variables ... */
  --checkbox-border: oklch(0.55 0.003 286);  /* ≈4.8:1 contrast vs white ✓ */
}

.dark {
  /* existing variables ... */
  --checkbox-border: oklch(0.5 0.006 286);   /* ≈3.4:1 contrast vs dark bg ✓ */
}
```

**Step 3b: Update `Checkbox.tsx`** — replace `border-[var(--border)]` with `border-[var(--checkbox-border)]`.

**Step 3c: Update `TodoForm.tsx` placeholder div** — remove `opacity-40` (opacity blending toward white mathematically cannot achieve 3:1 at any sub-full opacity) and use the WCAG-compliant border color:
```tsx
// FROM:
<div className="h-4 w-4 shrink-0 rounded-full border border-[var(--border)] opacity-40" aria-hidden="true" />

// TO:
<div className="h-4 w-4 shrink-0 rounded-full border border-[var(--checkbox-border)]" aria-hidden="true" />
```
The "placeholder" visual distinction is already clear from context: the div has no fill, no interactivity, no hover state, and `aria-hidden="true"`. Users see a plain empty circle which signals "not interactive" by its position and lack of affordance.

#### Task 4: `prefers-reduced-motion`

In `index.css`, add after the existing `@layer base` blocks:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
```
This disables `TodoRow.tsx`'s `transition-colors` class and any future CSS transitions/animations.

#### Task 5: `useTheme.test.ts`

Since `useTheme.ts` is in `frontend/src/hooks/`, a test file is required per CLAUDE.md:
> "Any new non-trivial file in `frontend/src/lib/` or `frontend/src/hooks/` must include a corresponding `.test.ts` file"

`useTheme.ts` was created in an earlier story — this story should add the test.

File: `frontend/src/hooks/useTheme.test.ts`

```ts
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { ThemeContext } from "@/components/ThemeProvider";
import { useTheme } from "./useTheme";

// Note: useTheme reads from ThemeContext — wrap renderHook with ThemeProvider or mock
```

Testing patterns:
- Mock `localStorage.getItem` / `setItem` with `vi.spyOn`
- Mock `window.matchMedia` to simulate system preference
- Wrap hook in `ThemeProvider` using `renderHook`'s `wrapper` option
- Test initial theme from: (a) localStorage, (b) system dark, (c) system light
- Test `toggleTheme` updates the theme and calls `localStorage.setItem`

#### Task 6: E2E tests

File: `e2e/tests/theme-accessibility.spec.ts`

Use existing conventions:
```ts
import { type APIRequestContext, expect, test } from "@playwright/test";

const API_BASE = "http://localhost/api";

async function deleteAllTodos(request: APIRequestContext) { ... }

test.beforeEach(async ({ request }) => {
  await deleteAllTodos(request);
});
```

Key tests:
1. **Theme toggle switches and persists** — toggle button, verify class on `html`, reload, verify class persists
2. **Dynamic aria-label** — verify aria-label is "Switch to dark mode" initially, then "Switch to light mode" after toggle
3. **Cursor-pointer** — use `page.evaluate` + `getComputedStyle` on each interactive element
4. **Tab navigation order** — use `page.keyboard.press("Tab")` sequentially, verify focus moves
5. **Focus rings** — verify `focus-visible:ring-2` is applied (check class or computed style after focusing)

---

### Architecture Compliance

- No backend changes — entirely frontend
- No API changes — no `npx orval` needed
- Files to modify: `Button.tsx`, `Checkbox.tsx`, `index.css`, `TodoForm.tsx`
- Files to create: `frontend/src/hooks/useTheme.test.ts`, `e2e/tests/theme-accessibility.spec.ts`
- Biome lint: `cd frontend && npx biome check --write .` and `cd e2e && npx biome check --write .`

### Previous Story Intelligence (Story 3.2)

From Story 3.2 implementation:
- **`Button.tsx` current `size="icon"` is `h-11 w-11`** (44px) — this was fixed in 3.2. Don't revert.
- **`Checkbox.tsx` has `before:inset-[-14px]`** 44px touch target via pseudo-element — keep this.
- **E2E pattern**: Use `deleteAllTodos` + `beforeEach` — same pattern as all other test files.
- **Playwright config** has `chromium`, `firefox`, `webkit` projects (added in 3.2 code review).
- **Test counts after 3.2**: 12 backend, 56 frontend unit, 16 E2E.
- **Biome**: `cd frontend && npx biome check --write .`, `cd e2e && npx biome check --write .`
- **`exact: true`** needed on `getByRole('button', { name: 'Delete todo' })` due to TodoRow computed accessible name including all child button labels.

### Git Intelligence

Recent commits:
- `078cb50` — Implement 3.2: responsive layout
- `e4c3a10` — Implement 3.1: error states

This story is entirely frontend. No backend changes, no Alembic migrations, no API regeneration.

### Project Structure — Files to Modify/Create

```
frontend/src/
├── index.css                         MODIFIED — add --checkbox-border variable, prefers-reduced-motion
├── components/
│   └── ui/
│       ├── Button.tsx                MODIFIED — add cursor-pointer
│       └── Checkbox.tsx              MODIFIED — add cursor-pointer, use --checkbox-border
├── components/
│   └── TodoForm.tsx                  MODIFIED — placeholder: use --checkbox-border, remove opacity-40
└── hooks/
    └── useTheme.test.ts              CREATED — unit tests for useTheme hook (REQUIRED by CLAUDE.md)

e2e/tests/
└── theme-accessibility.spec.ts      CREATED — E2E tests for theme toggle + accessibility

Files NOT changed:
- ThemeProvider.tsx (fully implemented)
- AppHeader.tsx (fully implemented)
- TodoItem.tsx (fully implemented)
- TodoRow.tsx (cursor-pointer already on rows)
- App.tsx (no changes needed)
- backend/ (no changes)
- frontend/src/api/generated/ (no API changes)
```

### References

- Story acceptance criteria [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3]
- FR-10/11 (resilience), FR-12 (responsive) covered in previous stories
- WCAG 2.1 AA target [Source: _bmad-output/planning-artifacts/epics.md#From UX Design]
- WCAG 1.4.11 (non-text contrast, 3:1 for UI components) [Source: WCAG 2.1 spec]
- WCAG 2.5.3 (cursor-pointer requirement) — hover cursors for interactive elements
- prefers-reduced-motion requirement [Source: _bmad-output/planning-artifacts/epics.md#From UX Design]
- ThemeProvider and useTheme pattern [Source: frontend/src/components/ThemeProvider.tsx, frontend/src/hooks/useTheme.ts]
- Button component (h-11 w-11 from story 3.2) [Source: frontend/src/components/ui/Button.tsx]
- Checkbox touch target (before:inset-[-14px] from story 3.2) [Source: frontend/src/components/ui/Checkbox.tsx]
- CSS custom properties [Source: frontend/src/index.css]
- TodoForm placeholder checkbox [Source: frontend/src/components/TodoForm.tsx]
- E2E test cleanup convention [Source: CLAUDE.md#E2E Test Conventions]
- Utility file testing requirement [Source: CLAUDE.md#Utility File Testing]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded without debug issues.

### Completion Notes List

- Added `cursor-pointer` to Button.tsx and Checkbox.tsx base class strings (Tasks 1–2)
- Introduced `--checkbox-border` CSS variable with WCAG AA 3:1 contrast values: `oklch(0.55 0.003 286)` (light) and `oklch(0.5 0.006 286)` (dark); updated Checkbox.tsx and TodoForm.tsx placeholder to use it (Task 3)
- Removed `opacity-40` from TodoForm placeholder div (mathematically cannot achieve 3:1 contrast at that opacity)
- Added `@media (prefers-reduced-motion: reduce)` block in index.css with `transition: none !important; animation: none !important` (Task 4; Biome warns about !important but this is intentional for accessibility override)
- Created `frontend/src/hooks/useTheme.test.ts` with 5 unit tests covering ACs 1–3; used `vi.stubGlobal("localStorage", ...)` to work around jsdom's limited localStorage implementation (Task 5)
- Created `e2e/tests/theme-accessibility.spec.ts` with 6 tests covering theme persistence, dynamic aria-label, cursor-pointer, Tab navigation, focus rings, and checkbox border contrast (Task 6)
- Tab navigation and focus ring tests use `browserName` guard for WebKit: Safari/WebKit doesn't Tab-focus `<button>` elements by default (known macOS platform behaviour). Chromium/Firefox fully tested. WebKit path verifies `<input>` is focusable and shows a focus ring
- All three test layers pass: 12 backend, 61 frontend unit (+5 new), 72 E2E (+18 new)

### File List

- frontend/src/components/ui/Button.tsx (modified — added cursor-pointer)
- frontend/src/components/ui/Checkbox.tsx (modified — added cursor-pointer, --checkbox-border)
- frontend/src/components/ui/Input.tsx (modified — focus-visible:outline-none, parent form handles focus indicator)
- frontend/src/index.css (modified — added --checkbox-border variable, prefers-reduced-motion)
- frontend/src/components/TodoRow.tsx (modified — forwardRef, rounded-lg hover, responsive py)
- frontend/src/components/TodoForm.tsx (modified — SVG dashed placeholder, focus-within ring on row, click-to-focus, hover ring)
- frontend/src/components/AppHeader.tsx (modified — px-4, responsive py)
- frontend/src/components/ErrorBanner.tsx (modified — mx-4 for alignment)
- frontend/src/App.tsx (modified — removed px-4 from main, responsive py)
- frontend/src/hooks/useTheme.test.ts (created — unit tests for useTheme / ThemeProvider)
- e2e/tests/theme-accessibility.spec.ts (created — E2E tests for theme toggle and accessibility)

### Change Log

- 2026-03-09: Implemented story 3.3 — cursor-pointer on buttons/checkboxes, WCAG AA checkbox border contrast, prefers-reduced-motion, useTheme unit tests, E2E accessibility tests. All 3 test layers pass.
- 2026-03-09: Code review fixes — (1) Added focus-visible:ring-2 to Input.tsx (was missing focus ring, violating AC 6); (2) Rewrote E2E contrast test to compute actual WCAG contrast ratios using oklch→sRGB→luminance conversion, covering both checkbox and TodoForm placeholder in light+dark modes; (3) Expanded focus ring test to verify all Tab-reachable elements have a ring (not just the theme toggle); (4) Added checkbox reachability assertion to Tab navigation test. All 72 E2E tests pass.
- 2026-03-09: UX refinements — (1) Replaced CSS border-dashed placeholder with SVG circle using strokeDasharray="4 3" for longer, clearer dashes; (2) Replaced input-level focus ring with focus-within:ring-2 on the entire form row (looks like a big input field); (3) Added click-to-focus: clicking anywhere in the form row (except buttons) focuses the input; (4) Added forwardRef to TodoRow; (5) Input.tsx reverted to outline-none only (parent handles indicator). All 72 E2E tests pass.
- 2026-03-09: Layout & polish — (1) Form ring lightened to --muted-foreground, added hover:ring-1 with --border color; (2) Todo item hover gets rounded-lg to match form row; (3) Removed px-4 from main, added to AppHeader — aligns title/labels/checkboxes on left, buttons on right; (4) Responsive padding: py-2 sm:py-3 on rows, py-2 sm:py-4 on header, py-4 sm:py-8 on main; (5) ErrorBanner gets mx-4 for alignment. All 72 E2E tests pass.
- 2026-03-09: Hover/focus consistency — Added --form-ring CSS variable (light: matches --border, dark: matches --muted-foreground) so hover and focus-within use identical ring-2 styling. Eliminates the mismatched thin hover vs thick focus and inconsistent colors across themes. All 72 E2E tests pass.
- 2026-03-09: Color tuning & form focus style — (1) Light --muted-foreground changed from oklch(0.47) to oklch(0.6) for more contrast between primary and muted text, matching dark mode's visual separation; (2) Dark --muted changed from oklch(0.14) to oklch(0.22) for more visible hover backgrounds; (3) Removed --form-ring variable — form hover/focus now uses background color (--muted) instead of ring outline, matching todo item hover style; (4) Updated E2E focus test to detect background change instead of box-shadow for the input's parent form. All 72 E2E tests pass.
- 2026-03-09: Icon button hover consistency — Moved hover color from individual SVG icons to the ghost Button variant (muted-foreground → foreground). Delete button overrides with hover:text-destructive via className. Icons now inherit color from the button, so the hover triggers on the full click target. All tests pass.
