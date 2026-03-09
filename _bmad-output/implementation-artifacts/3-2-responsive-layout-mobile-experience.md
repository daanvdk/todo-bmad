# Story 3.2: Responsive Layout & Mobile Experience

Status: done

## Story

As a **user**,
I want to use the app on any device — phone, tablet, or desktop — without horizontal scrolling or broken layouts,
so that I can manage my todos wherever I am.

## Acceptance Criteria

1. **Given** a viewport of 375px width (minimum supported)
   **When** the app renders
   **Then** all content fits within the viewport with no horizontal scrolling
   **And** all interactive elements (checkbox, trash icon, input, submit) are reachable and usable

2. **Given** any viewport from 375px to 1280px+
   **When** the app renders
   **Then** the layout is a single centered column with `max-w-2xl` cap on desktop and `px-4` inset on all sizes
   **And** no content overflows or is clipped at any viewport width in this range

3. **Given** any interactive element (checkbox, trash icon button, add button, theme toggle)
   **When** measured
   **Then** its effective touch target is at minimum 44×44px (WCAG 2.5.5)

4. **Given** a mobile device in portrait orientation
   **When** the user taps the `TodoForm` input
   **Then** the virtual keyboard opens and the input remains visible (input row at bottom of active section naturally stays near keyboard)

5. **Given** the app is tested on Chrome, Firefox, and Safari (latest stable)
   **Then** all core actions — create, view, complete, delete — work correctly in all three browsers
   **And** visual appearance is consistent across browsers

6. **Given** the `TodoRow` layout
   **Then** the checkbox and trash icon are on opposite sides of the row, making accidental simultaneous activation impossible

## Tasks / Subtasks

- [x] Task 1: Fix icon button touch target size (AC: 3)
  - [x] Update `Button.tsx`: change `size="icon"` class from `h-9 w-9` (36px) to `h-11 w-11` (44px)
  - [x] Verify the change does not visually break AppHeader or TodoItem layouts (flex containers absorb the extra size gracefully)

- [x] Task 2: Write E2E responsive tests in `e2e/tests/responsive-layout.spec.ts` (AC: 1, 2, 3, 6)
  - [x] Test: no horizontal scroll at 375px viewport width
  - [x] Test: layout works at 1280px viewport (max-w-2xl centered, no overflow)
  - [x] Test: all interactive elements are visible and enabled at 375px
  - [x] Test: checkbox is on left, trash icon on right of each todo row (opposite sides)

- [x] Task 3: Lint and verify (all ACs)
  - [x] Run `cd frontend && npx biome check --write .`
  - [x] Run `cd frontend && npx vitest run` — all tests pass
  - [x] Run `cd e2e && npx playwright test` — all E2E tests pass

## Dev Notes

### Current State of Codebase (After Story 3.1)

Story 3.1 (Loading & Error States) is done. Key state going into Story 3.2:

**`App.tsx` — responsive layout already in place:**
```tsx
<main className="max-w-2xl mx-auto px-4 py-8">
```
The `max-w-2xl mx-auto px-4` constraint satisfies AC2 already. No changes needed to `App.tsx`.

**`TodoRow.tsx` — layout already correct for AC6:**
```tsx
<Tag className={cn(
  "flex min-h-[44px] items-center gap-3 py-3 px-4",
  ...
)}>
  <div className="flex-shrink-0">{left}</div>   {/* checkbox — left side */}
  <div className="flex-1 min-w-0">{content}</div>  {/* text — center, overflow safe */}
  {right && <div className="flex-shrink-0">{right}</div>}  {/* trash icon — right side */}
</Tag>
```
- `flex-1 min-w-0` on content prevents text overflow. ✅
- Checkbox left, trash icon right by construction. ✅
- `min-h-[44px]` ensures rows are 44px tall. ✅

**`Button.tsx` — ISSUE: `size="icon"` is only 36×36px:**
```tsx
size === "icon" && "h-9 w-9",   // h-9 = 36px, w-9 = 36px — FAILS AC3
```
This violates WCAG 2.5.5 (minimum 44×44px touch target). Must be fixed.

Affected elements:
- Theme toggle in `AppHeader.tsx` — uses `size="icon"`
- Trash icon in `TodoItem.tsx` — uses `size="icon"` (inside 44px-tall row, but button itself is 36px)
- Add button in `TodoForm.tsx` — uses `size="icon"` (inside 44px-tall row, but button itself is 36px)

**`index.css` — no overflow issues:**
```css
body {
  margin: 0;
  min-height: 100vh;
}
```
No problematic fixed widths or overflow rules.

### Implementation Details

#### Task 1: Fix Button Touch Target

Single change in `frontend/src/components/ui/Button.tsx`:

```tsx
// Change:
size === "icon" && "h-9 w-9",

// To:
size === "icon" && "h-11 w-11",
```

`h-11` = 44px, `w-11` = 44px — matches WCAG 2.5.5 exactly.

**Why this is safe:**
- `AppHeader.tsx` uses `flex items-center justify-between` — the button is a flex item. Growing from 36→44px just adds 4px on each side. The header line height increases slightly but remains stable.
- `TodoRow.tsx` already has `min-h-[44px]` so the trash/add buttons expanding to 44px have room.
- The icon inside the button is sized explicitly (`h-[18px] w-[18px]` for theme toggle, `h-4 w-4` for todo icons) — icon sizes are unchanged.
- No visual test snapshots exist that would break.

#### Task 2: E2E Responsive Tests

File: `e2e/tests/responsive-layout.spec.ts`

Use Playwright's `page.setViewportSize()` to test at specific widths. Follow existing E2E conventions:
- `beforeEach` deletes all todos via API
- Use `API_BASE = "http://localhost/api"`
- Use `deleteAllTodos` helper pattern (same as other test files)

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

test("no horizontal scroll at 375px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  // Wait for app to load
  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeVisible();
  // scrollWidth <= clientWidth means no horizontal overflow
  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasHorizontalScroll).toBe(false);
});

test("no horizontal scroll at 375px with todos present", async ({ page, request }) => {
  // Seed a todo with long text
  await request.post(`${API_BASE}/todos`, {
    data: { text: "This is a very long task description that might cause overflow on mobile devices" },
  });

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  await expect(page.getByText("This is a very long")).toBeVisible();

  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasHorizontalScroll).toBe(false);
});

test("all interactive elements visible and usable at 375px", async ({ page, request }) => {
  // Seed one todo
  await request.post(`${API_BASE}/todos`, {
    data: { text: "Mobile test todo" },
  });

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  // Theme toggle reachable
  await expect(page.getByRole("button", { name: /switch to/i })).toBeVisible();
  // Checkbox reachable
  await expect(page.getByRole("checkbox")).toBeVisible();
  // Delete button reachable
  await expect(page.getByRole("button", { name: "Delete todo" })).toBeVisible();
  // Input reachable
  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeEnabled();
});

test("layout is single centered column at 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeVisible();

  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasHorizontalScroll).toBe(false);

  // main element should have max-w-2xl (672px) — not full 1280px width
  const mainWidth = await page.locator("main").evaluate((el) => el.getBoundingClientRect().width);
  expect(mainWidth).toBeLessThanOrEqual(672);
});
```

**Note on virtual keyboard (AC4):** This AC is satisfied by the existing layout — the `TodoForm` renders at the bottom of the active section as a normal document flow element. When the virtual keyboard opens, mobile browsers push the content up and the input stays in view. This cannot be tested in Playwright E2E without real device emulation. The AC is verified by layout inspection (input at bottom of content, not fixed-position-blocked).

**Note on cross-browser (AC5):** Playwright supports Chromium, Firefox, and WebKit (Safari). Running `npx playwright test` with the default config covers all three. No separate test file needed — the existing E2E suite already runs cross-browser.

**Note on opposite-sides layout (AC6):** Already guaranteed by `TodoRow.tsx` structure — `left` slot = checkbox, `right` slot = trash. No code change needed. The E2E test for "elements visible at 375px" implicitly verifies both are reachable.

### Architecture Compliance Checklist

- [x] `Button.tsx` updated: `h-11 w-11` for `size="icon"` (44px touch target)
- [x] No changes to `App.tsx` — `max-w-2xl mx-auto px-4` already correct
- [x] No changes to `TodoRow.tsx` — `min-h-[44px]` and flex layout already correct
- [x] No changes to `index.css` — no overflow issues found
- [x] No API changes — no backend changes, no `npx orval` needed
- [x] E2E tests use `beforeEach` for cleanup (not `afterEach`)
- [x] E2E tests use `deleteAllTodos` pattern matching existing test files
- [x] Biome run: `cd frontend && npx biome check --write .`
- [x] All three test layers pass before marking done

### Previous Story Intelligence (Story 3.1)

From Story 3.1 implementation:
- **Biome version**: 2.4.x — run `npx biome check --write .` after all changes
- **Vitest test count**: 55 unit tests passing — any change to Button.tsx might affect AppHeader tests if they assert specific CSS classes (check `AppHeader.test.tsx` if it exists)
- **E2E pattern**: `deleteAllTodos` helper + `beforeEach` cleanup — use this exact pattern in the new spec file
- **`page.route()`**: E2E tests use this for network interception — relevant for responsive tests that need seeded data
- **`aria-hidden="true"`**: TodoRow passes this down correctly (used for SkeletonRow) — no changes needed

**Potential test breakage:** If `AppHeader.test.tsx` asserts a specific size class on the Button (unlikely, but check). The unit tests mock ThemeProvider and useTheme, so no rendering issues from the hook.

### Git Intelligence

Recent commits:
- `712d38c` (latest) — Story 3.1 code review fixes (strengthened skeleton assertions, mutation error display test, TodoRow aria-hidden type narrowing)
- `179e20d` — Epic 2 retrospective
- `dcf3a2f` — Todo update/delete (Story 2.4)
- `812f0b3` — Todo create (Story 2.3)
- `fe20b0c` — Todo list view (Story 2.2)

**This story is entirely frontend** — no backend changes, no API regeneration needed. All changes are in `frontend/src/` and `e2e/`.

### Project Structure — Files to Modify/Create

```
frontend/src/
└── components/
    └── ui/
        └── Button.tsx            MODIFIED — h-11 w-11 for size="icon" (44px touch target)

e2e/tests/
└── responsive-layout.spec.ts    CREATED — E2E tests for 375px, 1280px viewports

Files NOT changed:
- App.tsx (max-w-2xl layout already correct)
- TodoRow.tsx (min-h-[44px] and layout already correct)
- index.css (no overflow issues)
- TodoItem.tsx (no changes needed)
- TodoForm.tsx (no changes needed)
- AppHeader.tsx (no changes needed)
- backend/ (no backend changes)
- frontend/src/api/generated/ (no API changes)
```

### References

- Story acceptance criteria [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2]
- FR-12 (375px+ responsive) [Source: _bmad-output/planning-artifacts/epics.md#Requirements Inventory]
- NFR-09 (mobile 375px+) [Source: _bmad-output/planning-artifacts/epics.md#Requirements Inventory]
- NFR-08 (Chrome, Firefox, Safari) [Source: _bmad-output/planning-artifacts/epics.md#Requirements Inventory]
- Touch target requirements (44×44px WCAG 2.5.5) [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Strategy]
- Responsive layout strategy (max-w-2xl, px-4) [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive Strategy]
- TodoRow layout primitive [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy (TodoRow)]
- Button component (size="icon" = h-9 w-9 = 36px) [Source: frontend/src/components/ui/Button.tsx]
- E2E test cleanup convention [Source: CLAUDE.md#E2E Test Conventions]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_None_

### Completion Notes List

- Fixed `Button.tsx` `size="icon"` from `h-9 w-9` (36px) to `h-11 w-11` (44px) to satisfy WCAG 2.5.5 touch target requirement (AC3). All three affected elements (theme toggle, trash icon, add button) now meet 44×44px minimum.
- Created `e2e/tests/responsive-layout.spec.ts` with 5 tests covering: no horizontal scroll at 375px (empty and with todos), all interactive elements reachable at 375px, centered layout at 1280px, and checkbox/trash icon on opposite sides of row.
- Fixed test locator strictness: used `{ exact: true }` on `getByRole('button', { name: 'Delete todo' })` because the `<li role="button">` parent also matched due to its computed accessible name including child labels.
- All 12 backend tests, 56 frontend unit tests, and 16 E2E tests pass (including 5 new responsive layout tests).

### File List

- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Checkbox.tsx`
- `e2e/tests/responsive-layout.spec.ts`
- `e2e/playwright.config.ts`
- `CLAUDE.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `.github/workflows/ci.yml`

## Change Log

- 2026-03-09: Implemented story — fixed Button icon touch target to 44px (WCAG 2.5.5), created E2E responsive layout test suite (5 tests). All test layers pass.
- 2026-03-09: Code review fixes — (1) Fixed Checkbox touch target: added invisible 44px hit area via pseudo-element (was 16px, violating AC3). (2) Added cross-browser Playwright projects (chromium, firefox, webkit) to satisfy AC5. (3) Added E2E touch target size assertions for WCAG 2.5.5 validation. (4) Added 768px tablet viewport test. (5) Updated story File List with all changed files.
- 2026-03-09: Code review #2 — (1) Added E2E offset-click assertion for checkbox touch target (AC3 was untested for checkbox; pseudo-element hit area verified via click 12px outside visual bounds). (2) Added CLAUDE.md to File List (was in commit but undocumented). (3) Checked off Architecture Compliance Checklist. (4) Added AC5 rationale comment to playwright.config.ts.
- 2026-03-09: CI fix — updated `.github/workflows/ci.yml` to install all three Playwright browsers (`chromium firefox webkit`) instead of only `chromium`, matching the multi-browser projects added to `playwright.config.ts` for AC5.
