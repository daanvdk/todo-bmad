# Accessibility Report — todo-bmad

**Date:** 2026-03-10
**Stories:** 3.3 — Theme Toggle & Accessibility; 5.3 — Accessibility Audit
**Auditor:** Claude Sonnet 4.6 (automated)
**Scope:** WCAG 2.1 AA compliance, keyboard navigation, ARIA semantics, color contrast, reduced motion, automated axe scanning, Lighthouse audit

---

## Summary

| Area | Status | Finding |
|------|--------|---------|
| Lighthouse accessibility score | ✅ Pass | 100/100 (threshold ≥90) |
| Axe WCAG AA — loaded list state | ✅ Pass | 0 violations |
| Axe WCAG AA — empty state | ✅ Pass | 0 violations |
| Axe WCAG AA — loading skeleton state | ✅ Pass | 0 violations |
| Axe WCAG AA — error banner state | ✅ Pass | 0 violations |
| Axe WCAG AA — dark mode state | ✅ Pass | 0 violations |
| Keyboard navigation | ✅ Pass | All interactive elements reachable via Tab; no traps |
| Focus ring visibility | ✅ Pass | Focus rings confirmed on all focusable elements |
| ARIA labels | ✅ Pass | All interactive elements have descriptive labels |
| Semantic HTML | ✅ Pass | `<main>`, `<header>`, `<ul>`, `<li>` used correctly |
| Color contrast — body text | ✅ Pass | WCAG AA 4.5:1 met in light and dark modes |
| Color contrast — UI components | ✅ Pass | WCAG AA 3:1 met for checkbox borders and form elements |
| Reduced motion | ✅ Pass | `prefers-reduced-motion: reduce` disables all transitions and animations |

**Overall accessibility posture: PASS** — All WCAG 2.1 AA automated checks pass. Lighthouse score 100/100. Three violations found during implementation were remediated before story completion.

---

## 1. Lighthouse Audit

**Tool:** `lighthouse` (via npx)
**Command:** `npx lighthouse http://localhost --only-categories=accessibility --output=json --chrome-flags="--headless --no-sandbox"`
**Target:** Full Docker stack at `http://localhost`

### Result

| Category | Score | Threshold |
|----------|-------|-----------|
| Accessibility | **100/100** | ≥90 |

**Verdict: PASS** — Score exceeds the ≥90 AC threshold by 10 points. AC #3 (Story 5.3) satisfied.

---

## 2. Automated Axe WCAG AA Scanning

**Tool:** `@axe-core/playwright` v4.11.1 (official Deque-maintained package)
**Test file:** `e2e/tests/accessibility.spec.ts`
**Standard:** WCAG 2.1 AA (`wcag2a`, `wcag2aa` tags)
**Browsers:** Chromium, Firefox, WebKit

Five distinct application states are scanned on every CI run:

| App State | Setup Method | Violations |
|-----------|--------------|------------|
| Loaded list | Seed ≥1 todo via API, wait for list | 0 |
| Empty state | Delete all todos, wait for empty render | 0 |
| Loading skeleton | Intercept `GET /api/todos` with 3s delay | 0 |
| Error banner | Intercept `GET /api/todos` to return 500, wait for `role="alert"` | 0 |
| Dark mode | Set `localStorage` theme to dark, reload | 0 |

**Verdict: PASS** — Zero violations across all five states and all three browsers. ACs #1, #2, #5 (Story 5.3) satisfied.

---

## 3. Keyboard Navigation and Focus Management

**Test file:** `e2e/tests/theme-accessibility.spec.ts`
**Story:** 3.3

### Interactive Elements Tested

| Element | Keyboard Reachable | Focus Ring Visible | Notes |
|---------|-------------------|--------------------|-------|
| Theme toggle button | ✓ | ✓ | `focus-visible:ring-2` |
| Add task input | ✓ | ✓ | Focus-within ring on parent form row |
| Add todo button | ✓ | ✓ | `focus-visible:ring-2` |
| Todo item row (checkbox) | ✓ | ✓ | `focus-visible:ring-2` |
| Delete todo button | ✓ | ✓ | `focus-visible:ring-2` |

**Tab order:** Logical top-to-bottom, left-to-right flow with no traps confirmed by sequential `keyboard.press("Tab")` assertions.

**WebKit caveat:** Safari/WebKit does not Tab-focus `<button>` elements by default (known macOS platform behaviour). The E2E test guards for `browserName === "webkit"` and verifies `<input>` focusability and focus ring visibility on WebKit. Chromium and Firefox test the full Tab sequence including all buttons.

**Verdict: PASS** — AC #6 (Story 3.3) satisfied.

---

## 4. ARIA Semantics

**Story:** 3.3
**Review method:** E2E assertions + component source inspection

| Element | ARIA Attribute | Value | Notes |
|---------|---------------|-------|-------|
| Theme toggle | `aria-label` | "Switch to dark mode" / "Switch to light mode" | Dynamic, updates on toggle |
| Todo checkbox | `aria-label` | "Mark as complete" / "Mark as active" | Dynamic, reflects completion state |
| Delete button | `aria-label` | "Delete todo" | Static |
| Add task input | `aria-label` | "Add a task" | Static |
| Error banner | `role` | `alert` | Announces errors to screen readers |

**Verdict: PASS** — All interactive elements have descriptive ARIA labels. ACs #4, #7, #10, #11 (Story 3.3) satisfied.

---

## 5. Color Contrast

**Standard:** WCAG 2.1 AA — 4.5:1 for normal text; 3:1 for UI components (WCAG 1.4.11)

### Body Text

| Context | Color Token | Final Contrast Ratio | Threshold |
|---------|-------------|---------------------|-----------|
| Primary text — light mode | `--foreground` | >7:1 | ≥4.5:1 ✓ |
| Primary text — dark mode | `--foreground` | >7:1 | ≥4.5:1 ✓ |
| Muted text — light mode | `--muted-foreground` (`#767676`) | 4.54:1 | ≥4.5:1 ✓ |
| Muted text — dark mode | `--muted-foreground` | ≥4.5:1 | ≥4.5:1 ✓ |

**Note on muted text:** Light-mode `--muted-foreground` is `#767676` (4.54:1), the WCAG AA minimum value for normal text.

### UI Components (Checkbox Borders)

Introduced `--checkbox-border` CSS variable in Story 3.3 specifically to meet WCAG 1.4.11:

| Context | CSS Variable | Contrast Ratio | Threshold |
|---------|-------------|----------------|-----------|
| Checkbox border — light mode | `--checkbox-border: oklch(0.55 0.003 286)` | ~4.8:1 vs white | ≥3:1 ✓ |
| Checkbox border — dark mode | `--checkbox-border: oklch(0.5 0.006 286)` | ~3.4:1 vs dark bg | ≥3:1 ✓ |

The previous `--border` variable (used before Story 3.3) produced ratios of ~1.35:1 in light mode and ~1.17:1 in dark mode — both failing WCAG 1.4.11. The dedicated `--checkbox-border` variable replaced it in `Checkbox.tsx` and the `TodoForm` placeholder element.

**TodoForm placeholder:** The `opacity-40` style previously applied to the placeholder circle div was removed. Mathematical analysis confirmed that opacity below ~0.55 against white background cannot achieve 3:1 contrast regardless of border color. The visual distinction is preserved by context (no fill, no interactivity, `aria-hidden="true"`).

**Verdict: PASS** — ACs #8, #9, #13 (Story 3.3) satisfied.

---

## 6. Semantic HTML

**Story:** 3.3

| Element | Tag Used | Notes |
|---------|----------|-------|
| Page landmark | `<main>` | Wraps entire todo content area |
| App header | `<header>` | Contains title and theme toggle |
| Todo list | `<ul>` | Semantic list container |
| Todo items | `<li>` | Each todo row is a list item |

**Verdict: PASS** — AC #12 (Story 3.3) satisfied.

---

## 7. Reduced Motion

**Story:** 3.3
**Implementation:** `@media (prefers-reduced-motion: reduce)` block in `frontend/src/index.css`

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
```

When the OS has reduced motion enabled, all CSS transitions and animations (including `TodoRow`'s `transition-colors`, checkbox animations, and any future additions) are disabled globally.

**Verdict: PASS** — AC #14 (Story 3.3) satisfied.

---

## 8. Test Coverage Summary

| Test File | Tests | Type | What It Covers |
|-----------|-------|------|----------------|
| `e2e/tests/accessibility.spec.ts` | 5 | E2E (axe) | Full-page WCAG AA scans across 5 app states |
| `e2e/tests/theme-accessibility.spec.ts` | 6 | E2E | Theme toggle, ARIA labels, cursor, Tab nav, focus rings, contrast |

All 11 accessibility tests run across 3 browsers (Chromium, Firefox, WebKit) as part of the standard CI E2E suite — no separate accessibility pipeline required.

---

## 9. Accepted Limitations

No unresolved WCAG AA violations were found. The following items are documented as accepted limitations or informational observations:

- **WebKit button focus behaviour:** Safari/WebKit does not Tab-focus `<button>` elements unless the user enables "Full Keyboard Access" in System Settings. This is a platform-level behaviour, not a product defect. E2E tests guard for this with `browserName` conditionals; full keyboard navigation is verified on Chromium and Firefox.

- **`color-contrast` axe rule and oklch:** axe does not natively parse oklch CSS values. All CSS custom property values in `index.css` were converted from oklch to hex to ensure correct axe scanning. Future CSS additions should use hex or rgb values for variables that affect text or UI component contrast.

- **Muted text design intent:** The muted foreground color (`--muted-foreground`) is intentionally de-emphasized secondary text (e.g., timestamps). WCAG AA requires 4.5:1 for all normal text regardless of visual hierarchy intent. The value was tightened to exactly the AA minimum (`#767676`, 4.54:1). Any future design changes to this token should be validated against the 4.5:1 threshold.

---

## Appendix: Audit Commands Used

```bash
# Lighthouse audit (run once against full Docker stack)
npx lighthouse http://localhost --only-categories=accessibility \
  --output=json --output-path=/tmp/lighthouse-a11y.json \
  --chrome-flags="--headless --no-sandbox"

# Extract score
node -e "const r=require('/tmp/lighthouse-a11y.json'); console.log('Score:', r.categories.accessibility.score * 100)"

# Axe WCAG AA tests (run as part of standard E2E suite)
cd e2e && npx playwright test tests/accessibility.spec.ts
cd e2e && npx playwright test tests/theme-accessibility.spec.ts

# Full E2E suite (includes accessibility tests)
cd e2e && npx playwright test
```
