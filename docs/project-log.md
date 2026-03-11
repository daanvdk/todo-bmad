## What is BMAD?

The short version: BMAD is an AI-native project methodology that structures
work through planning artifacts, sprint cycles, and working agreements in
`CLAUDE.md`. It pairs a project manager agent, scrum master agent, developer
agent, and QA agent — all running in Claude — to simulate a small engineering
team around a solo developer.

I used it to build a full-stack todo app: React + TanStack Query frontend,
FastAPI backend, PostgreSQL, all containerized with Docker Compose. Overkill for
a todo app? Maybe. But the point was to try the methodology on something real
enough to reveal friction.

---

## Before the First Story: Planning Phase

Before any code was written, BMAD runs through a planning phase involving
several artifacts: a Product Requirements Document, a UX design document, an
architecture document, and an epics/stories breakdown.

- The planning phase went relatively quick, I provided it with the PRD from the
assignment. The agent mainly focused on rewriting the PRD from plain prose to
a structured document in the format BMAD expects. For this we also had some
details to make more specific but overal this went quite quick.
- The UX and architecture docs were also quite quick to make, they asked for
some general direction and then supplied quite complete documentation with some
meaningful iteration with me in the loop mainly for the UX part.
- The architecture part was very well implemented later by the agents, they
basically did exactly what I expected here.
- The UX design implementation went less well, I think I expected the agents to
be able to make a decent oneshot design because the mockups made in the UX
design doc were immediately quite good, just some structural decisions were
made in the iteration. However the actually implemented design did not look like
the mockups in a lot of the details, it actually felt oddly similar to working
with real humans where a designer would pay attention to detail with things like
padding, spacing, alignment etc. And then a developer without an eye for these
things would fail to implement any of these details. This was a bit surprising
to me given it was done by the same LLM, but I guess this shows the power of
personas. Worth exploring further how to make a better design doc that is clear
enough for the dev persona.

---

## Epic 1: Project Foundation

**What we built:** A monorepo development environment. Vite + React, FastAPI,
PostgreSQL, Caddy as a reverse proxy — all wired together via Docker Compose
with hot-reload. Plus a GitHub Actions CI pipeline with four quality gates:
backend checks, frontend checks, E2E tests, and an "orval-freshness" job that
detects API client drift.

**How it went:** Remarkably smoothly. Both stories delivered on the first pass,
needing only small refinements. The planning artifacts — architecture doc, epics
spec — were detailed enough that the dev agent had clear targets.

The most interesting moment was a mid-story decision: when implementing CI,
it became clear the Docker setup needed restructuring to support GHA's Docker
Bake caching. This wasn't in the story spec. I directed the agent to restructure
it — baking the Caddyfile into the proxy image, reducing production volumes to
data-only, adding a custom `db/Dockerfile` for future Postgres extensions. It
was the right call, and the kind of improvement that emerges naturally when
you're actually doing the implementation work rather than just speccing it
upfront.

The code review loop also found real issues before they became debt: an ESLint
conflict with Biome, a missing backend healthcheck, missing type configuration
for vitest globals. Small things, but the kind that quietly accumulate into
friction if left.

---

## Epic 2: Core Todo Management

**What we built:** The full task management loop — create, view, complete,
delete — with optimistic UI throughout. All mutations update the UI instantly
before server confirmation. State persists across reloads. All 9 core functional
requirements covered.

**Numbers:** 38 unit tests, 9 E2E tests.

**The standout win:** Working agreements. After Epic 1's retrospective, we
added two habits to `CLAUDE.md`: run tests after every change and confirm the
fix worked, run the linter after every file edit. These compounded across all
four stories. By Story 2.4, the agent was proactively extracting the optimistic
update pattern into a generic `makeOptimisticHandlers` helper — organic
architecture improvement without prompting.

The code review caught correctness issues every single story: a deprecated type
import, a missing `order_by` clause causing non-deterministic API responses,
invalid HTML nesting, naming inconsistencies, missing test coverage for edge
cases. Not style nits — things that would have caused bugs or confusion later.

**The one gap:** `optimisticMutation.ts` shipped without tests in the initial
pass. Caught at review and fixed, but it established a lesson: utility files
are the easiest things to unit test, and skipping them is purely habitual, not a
real tradeoff.

---

## Epic 3: Resilience, Polish & Accessibility

**What we built:** Loading skeletons, error states, responsive layout down to
375px mobile, dark/light theme toggle with system preference detection, and full
WCAG AA accessibility compliance.

**Numbers:** Frontend unit tests grew from 38 to 61. E2E grew from 9 to 72 (32
unique tests across Chromium, Firefox, and WebKit). E2E coverage now included
real WCAG contrast ratio verification — computing oklch → sRGB → relative
luminance inside Playwright.

**The Playwright MCP win:** Partway through this epic I enabled Playwright MCP
— a tool that lets the agent take screenshots and interact with the running
browser mid-implementation. Being able to verify visual states directly, rather
than describing what to check, made a noticeable difference. The accessibility
verification work in Story 3.3 especially benefited.

**The honest friction:** Story 3.3 needed five or more review iterations.
Not all of them were accessibility failures. A significant portion was visual
refinement — hover consistency, form focus style, icon colors, spacing — based
on my preferences after seeing the rendered result. The agentic loop for this
kind of work (describe → implement → inspect → adjust) is slower than just
editing the CSS yourself. Agentic AI excels at well-specified, testable work.
Subjective visual polish based on personal taste is better handled directly.

There was also a design fidelity gap: the implementation inherited shadcn/ui
defaults rather than the values from the mockup. The checkbox contrast failure
(a WCAG 1.4.11 violation) is the clearest example — the design had visually
intentional values; the framework shipped different ones. Lesson for next time:
pin CSS custom property values explicitly in the UX spec.

---

## Epics 4 & 5: Infrastructure Hardening + Quality Assurance

**What we built:** Non-root container users, a `/health` backend endpoint,
Docker Compose health checks and service dependency ordering. Then: test
coverage analysis (98% backend, 97% frontend), performance validation,
accessibility audit (Lighthouse 100/100), and a security review.

**The unexpected find:** The coverage push in Story 5.1 discovered a bug
that had been hiding since Epic 2. During a code review fix in Story 2.4,
the `nextTempId` implementation was refactored from a decrementing counter to
use a `let` variable — but it should have been a `useRef`. The `let` variable
resets on every render, which means optimistic IDs can collide under the right
conditions. The bug survived through Epics 3 and 4 undetected because optimistic
IDs are short-lived and no unit test existed for the hook. The coverage pass
exposed it. That one find alone justified the investment.

**The Axe friction:** The accessibility automated testing tool (Axe) flags
WCAG AA contrast violations on *all* normal text, including deliberately
de-emphasized secondary text like timestamps. There's no per-element exception
mechanism — you can exclude elements entirely or disable the rule globally.
This created friction: Axe flagged secondary text that was intentionally
de-emphasized, but there was no clean way to say "check everything except
contrast on these elements."

This isn't a fringe complaint. Industry consensus appears to be that applying
the 4.5:1 ratio uniformly to all text is too blunt an instrument. Major design
systems like Material Design intentionally use lower-contrast secondary text and
labels — prioritizing visual hierarchy over strict WCAG AA compliance for
non-primary content. The standard itself doesn't distinguish between body copy
and a de-emphasized timestamp, but designers clearly do, and widely-adopted
systems reflect that.

The takeaway for future projects: disable the `color-contrast` rule at setup
and treat contrast as a design review concern rather than an automated gate.
Axe captures 90%+ of its value through structural accessibility checks anyway.

**The security result:** Clean. Zero CVEs across all dependencies. CORS properly
locked. No secrets in git history. All containers non-root. All database access
through the ORM.

---

## Key Lessons I'd Carry Forward

1. **Fixing code during review creates unreviewed code.** The `nextTempId` bug
was introduced *during* a code review fix and never seen by fresh eyes.
Throughout
this project, review applied fixes directly — which kept workflow simple — but
the `nextTempId` case illustrated the footgun: changes made at review stage
bypass
the review cycle entirely. The cleaner approach is to have review produce a
findings list and send it back to dev, though this adds orchestration overhead.
A worthwhile tradeoff to consider from the start of a project rather than
discovering it in the last retrospective.

2. **Agentic AI excels at well-specified, testable work.** Iterative visual
polish based on personal taste is better handled directly.

3. **Working agreement documentation compounds.** The `CLAUDE.md` habits
established in Epic 1 paid dividends in every subsequent story. Invest in them
early.

4. **Floor thresholds in specs, not exact targets.** `>=70%` coverage allowed
pushing to 90% enforcement thresholds. Exact targets become ceilings.

---

## Open Questions

1. **How to improve the UX design spec** The UX design spec was one of the
parts where I felt like I put effort that was in vain. The spec seemed clear
enough since the mockups made by the UX designer were exactly what I wanted
visually but somehow this did not translate well to implementation. Worth
figuring out how to do this better.

2. **How would BMAD function in a team context** The way of working iterating
through the stories was very straightforward working on a project solo. But I
am curious what would be best practices to structure this in a team context.
Also how would you handle things like the retrospective flow.

3. **Investigating AI orchestration with BMAD** A lot of the steps were: clear
context, change model, run step. This was a relatively fixed pattern, it could
be worthwile to looking into using orchestration for this to only be prompted
for input when there is actual value to deliver (reviewing spec, reviewing
code, etc). Also should look how versioning would fit into this, in general
I prefer to be in charge of versioning myself vs the agent. But maybe I could
at least have it use `jj new` to isolate the revisions of different stories but
still leave commit naming and pushing up to me.

---

*Partially reconstructed from epic retrospectives dated 2026-03-06 through
2026-03-10.*
