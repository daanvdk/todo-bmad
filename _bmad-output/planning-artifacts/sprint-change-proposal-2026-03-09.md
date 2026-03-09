# Sprint Change Proposal — 2026-03-09

**Project:** todo-bmad
**Prepared by:** Correct Course Workflow
**Date:** 2026-03-09
**Status:** Approved — 2026-03-09

---

## Section 1: Issue Summary

**Problem Statement:**
Manual UI testing during Epic 3 implementation revealed two distinct visual/accessibility gaps not captured in the original story acceptance criteria:

1. **Checkbox border visibility** — Unselected checkbox borders use a color that is too light against the background in both light and dark themes. The placeholder checkbox rendered inside `TodoForm` is additionally affected by an opacity rule applied to convey its "ghost" / inactive state, making the border nearly invisible.

2. **Missing pointer cursors** — Five interactive element types display the default arrow cursor instead of `cursor: pointer`: the theme toggle, TodoItem checkboxes, TodoForm placeholder checkbox, the delete button, and the submit/add button.

**Discovery context:**
Found during manual browser testing in the Epic 3 sprint, after Stories 3.1 and 3.2 were implemented. Story 3.3 (Theme Toggle & Accessibility) is still in backlog.

**Evidence:**
- Direct visual inspection: checkbox borders are barely visible at rest
- TodoForm placeholder checkbox: near-invisible border due to compounded opacity
- Hovering over theme toggle, checkboxes, delete, and add buttons shows `cursor: default` in browser DevTools

---

## Section 2: Impact Analysis

**Epic Impact:**
- Epic 3 (Resilience, Polish & Accessibility) is unaffected in scope — these fixes reinforce its stated goal.
- No epic-level modifications required. Story 3.3 is still backlog and is the natural home for these changes.
- No other epics affected (Epic 3 is the final epic).

**Story Impact:**
- Story 3.3 (Theme Toggle & Accessibility): Add two new acceptance criteria (see Section 4).
- Stories 3.1 and 3.2: No changes — already done/in review.
- No new stories required.

**Artifact Conflicts:**
- PRD: No conflict. Fixes support the WCAG 2.1 AA target stated in the epics document.
- Architecture: No impact — pure CSS/component-level changes.
- UX Spec: No conflict. Changes are consistent with the spec's intent (WCAG AA, 44×44px touch targets, accessibility focus).

**Technical Impact:**
- Frontend only. Changes are limited to Tailwind CSS classes / shadcn/ui component configuration.
- No API, database, or infrastructure changes.
- No new dependencies.

---

## Section 3: Recommended Approach

**Selected path: Option 1 — Direct Adjustment**

Fold both fixes into Story 3.3 (Theme Toggle & Accessibility) as additional acceptance criteria.

**Rationale:**
- Story 3.3 is still backlog — no rework of in-progress or completed stories required.
- Cursor behavior is an accessibility concern (WCAG 2.5.3) and fits naturally in the accessibility-focused story.
- Checkbox border contrast is a WCAG AA criterion (3:1 for UI components) — also squarely in scope for 3.3.
- Effort is low (CSS class additions / Tailwind config); risk is low (no logic changes, no API impact).
- Keeping both fixes in one story avoids story fragmentation for what are minor CSS changes.

**Effort estimate:** Low
**Risk level:** Low
**Timeline impact:** None — Story 3.3 is not yet started.

---

## Section 4: Detailed Change Proposals

### Story 3.3 — Theme Toggle & Accessibility
**File:** `_bmad-output/planning-artifacts/epics.md`
**Section:** Acceptance Criteria

---

**Change 1: Pointer cursor on interactive elements**

```
OLD:
(no cursor-related acceptance criterion exists)

NEW — Add after the theme toggle aria-label criterion:

Given any interactive element (theme toggle, checkboxes in TodoItem
and TodoForm, delete button, submit/add button)
When the user hovers over it with a pointing device
Then the cursor changes to `cursor: pointer`
```

*Rationale:* Missing pointer cursors on five element types discovered during manual testing. Signals clickability and is standard browser/OS convention for interactive controls.

---

**Change 2: Checkbox border visibility**

```
OLD:
(no checkbox border contrast criterion exists)

NEW — Add after the checkbox aria-label criterion:

Given an unselected checkbox in TodoItem
When rendered in either light or dark mode
Then the checkbox border is clearly visible with sufficient contrast
against its background (WCAG AA minimum: 3:1 for UI components)

Given the placeholder checkbox in TodoForm
When rendered in either light or dark mode
Then the checkbox border remains clearly visible and the element's
opacity styling does not reduce border contrast below WCAG AA threshold
```

*Rationale:* Checkbox borders are too light to be clearly visible at rest. The TodoForm placeholder checkbox compounds this with additional opacity. Both cases identified during manual testing.

---

## Section 5: Implementation Handoff

**Change scope classification: Minor**
→ Direct implementation by development team. No backlog reorganization or strategic replan required.

**Handoff recipient:** Development team (dev agent)

**Responsibilities:**
- Update `epics.md` Story 3.3 acceptance criteria per Section 4 above
- When implementing Story 3.3: apply `cursor-pointer` Tailwind class to theme toggle, both checkbox types, delete button, and submit button
- When implementing Story 3.3: adjust checkbox border color token or shadcn/ui Checkbox configuration to meet WCAG 3:1 contrast; remove or scope the opacity rule on the TodoForm placeholder checkbox so it does not affect the border

**Success criteria:**
- Hovering any interactive element shows `cursor: pointer` in all supported browsers (Chrome, Firefox, Safari)
- Unselected checkbox border is clearly visible in light and dark mode
- TodoForm placeholder checkbox border remains visible at its applied opacity level
- All existing 3.3 acceptance criteria continue to pass
