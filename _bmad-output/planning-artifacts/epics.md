---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
status: 'complete'
completedAt: '2026-03-05'
lastUpdated: '2026-03-09'
changeLog:
  - date: '2026-03-09'
    changes: 'Added Epic 4 (Infrastructure Hardening) and Epic 5 (Quality Assurance) with full story breakdowns'
inputDocuments:
  - docs/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# todo-bmad - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for todo-bmad, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-01: Users can create a todo with a text description of up to 500 characters
FR-02: Users cannot submit an empty todo
FR-03: Users see new todos appear in the list immediately after creation, without a page reload
FR-04: Users can view the creation timestamp for each todo item
FR-05: Users can toggle a todo between active and completed states
FR-06: Users can distinguish completed todos from active todos at a glance
FR-07: Users can delete any todo permanently
FR-08: Users can retrieve their todo list in its current state (text, completion, timestamp) after a page reload
FR-09: Users see an empty state when no todos exist
FR-10: Users see a loading indicator while todo data is being fetched
FR-11: Users see an error message when a data operation fails; the app remains functional
FR-12: Users can access all app functionality on viewports 375px wide and above without horizontal scrolling

### NonFunctional Requirements

NFR-01: UI reflects user actions (create, complete, delete) within 200ms under normal load, single user
NFR-02: Initial todo list renders within 1 second — single user, under 100 todos, normal network
NFR-03: API responses return within 500ms for 95th percentile — single user, normal load
NFR-04: Todo data is durable across page refresh and browser session restart
NFR-05: Client-side errors do not crash the application; all failures produce a visible error message
NFR-06: A developer unfamiliar with the codebase can locate, understand, and modify any feature area — verified within 4 hours
NFR-07: Architecture must not block future addition of authentication and multi-user support
NFR-08: Application functions correctly on latest stable versions of Chrome, Firefox, and Safari
NFR-09: All core actions are usable on mobile devices with viewport width 375px and above

### Additional Requirements

**From Architecture:**
- No starter template used — project initialized independently: frontend via `npm create vite@latest`, backend via `uv init`, composed via Docker Compose
- First implementation story: scaffold the monorepo (frontend, backend, Docker Compose, Caddy proxy) and verify the OpenAPI → Orval → TanStack Query codegen pipeline end-to-end
- SQLModel split model pattern required: `TodoBase`, `TodoCreate`, `TodoPublic`, `Todo` (table=True)
- Alembic migrations applied on container startup via `entrypoint.sh` (before uvicorn starts)
- Optimistic update pattern (onMutate/onError/onSettled) applied consistently to all three mutations: create, toggle, delete
- Generated API client (`frontend/src/api/generated/`) committed to repo but never edited by hand — regenerated with `npx orval`
- Auth-readiness: no `user_id` in v1 but data model and API must accept it via Alembic migration without restructuring
- CORS configured via Pydantic Settings: permissive in dev, locked in prod; no complexity needed due to Caddy same-origin routing
- CI pipeline: GitHub Actions with 4 jobs — `backend-checks` (ruff + pytest), `frontend-checks` (biome + vitest), `e2e` (Docker stack + Playwright), `orval-freshness`
- Testing: pytest + pytest-asyncio + httpx + aiosqlite (backend), vitest + @testing-library/react (frontend), Playwright 1.58.2 (E2E)
- Linting/formatting: Ruff 0.15.x (backend), Biome 2.4.5 (frontend)
- Naming: DB `snake_case`, API plural nouns, JSON `snake_case`, Python `snake_case` files, React components `PascalCase`
- `psycopg2-binary` for Alembic sync driver (derived from `DATABASE_URL` by replacing asyncpg prefix)
- `aiosqlite` dev dependency for in-memory SQLite async test sessions
- ThemeProvider component applies `dark` class to `<html>` and exposes theme context via `useTheme` hook

**From UX Design:**
- WCAG 2.1 Level AA accessibility target throughout
- All interactive elements must have minimum 44×44px touch targets
- All icon-only buttons require `aria-label` attributes
- `ErrorBanner` must use `role="alert"` for immediate screen reader announcement
- Semantic HTML: `<main>`, `<header>`, `<ul>`, `<li>` for list structure
- Timestamps wrapped in `<time dateTime="...">` element
- Checkbox accessible via Radix UI (keyboard nav, focus-visible ring, screen reader label)
- System preference (`prefers-color-scheme`) as default dark mode; manual toggle persisted to `localStorage`
- All CSS transitions/animations respect `prefers-reduced-motion`
- Skeleton loading rows at same height as real rows to prevent layout shift on initial fetch
- Input row inline within active section list; faded placeholder checkbox for visual parity; sticky at bottom
- Section labels ("Completed" / "Active") render only when section has items
- No confirmation dialogs — delete is immediate and permanent
- All mutations optimistic — UI updates before server confirmation; error surfaced inline if sync fails

### FR Coverage Map

FR-01 (create todo, 500 chars)       → Epic 2: Core Todo Management
FR-02 (reject empty submission)      → Epic 2: Core Todo Management
FR-03 (immediate list appearance)    → Epic 2: Core Todo Management
FR-04 (creation timestamps)          → Epic 2: Core Todo Management
FR-05 (toggle active/completed)      → Epic 2: Core Todo Management
FR-06 (visual distinction)           → Epic 2: Core Todo Management
FR-07 (permanent delete)             → Epic 2: Core Todo Management
FR-08 (persistence across reload)    → Epic 2: Core Todo Management
FR-09 (empty state)                  → Epic 2: Core Todo Management
FR-10 (loading indicator)            → Epic 3: Resilience, Polish & Accessibility
FR-11 (error message, non-blocking)  → Epic 3: Resilience, Polish & Accessibility
FR-12 (375px+ responsive)            → Epic 3: Resilience, Polish & Accessibility

## Epic List

### Epic 1: Project Foundation & Development Environment

The full-stack monorepo is scaffolded and running locally. The Vite + React + FastAPI + PostgreSQL stack is operational via Docker Compose with Caddy proxy, the OpenAPI → Orval → TanStack Query codegen pipeline is verified end-to-end, and GitHub Actions CI is active with all 4 quality gates passing.

**Developer Outcome:** Developers can run the app locally, make changes with hot-reload, and push code with confidence that CI will catch regressions.

**FRs covered:** None directly — technical foundation enabling all FRs
**NFR coverage:** NFR-06 (maintainability via clear structure), NFR-07 (auth-readiness established by design)

---

### Epic 2: Core Todo Management

Users can create, view, complete, and delete todos. All state persists across page reloads. New todos appear instantly (optimistic UI). Creation timestamps are visible. Active and completed todos are visually distinct. Empty state is handled.

**User Outcome:** The complete task management loop works — add a task, check it off, delete it, come back tomorrow and find it all intact.

**FRs covered:** FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08, FR-09
**NFR coverage:** NFR-01 (200ms UI response via optimistic updates), NFR-04 (persistence)

---

### Epic 3: Resilience, Polish & Accessibility

The app handles every state gracefully — loading, error, and edge cases. It works on all supported browsers and devices. Theme toggle (light/dark) is available. The interface meets WCAG 2.1 AA accessibility standards. All NFR benchmarks are demonstrably met.

**User Outcome:** Users get clear, non-blocking feedback when things go wrong; they can use the app on their phone without friction; the experience is polished and accessible.

**FRs covered:** FR-10, FR-11, FR-12
**NFR coverage:** NFR-01 (validated), NFR-02, NFR-03, NFR-05, NFR-08, NFR-09

---

### Epic 4: Infrastructure Hardening

All containers run as non-root users. A static health endpoint is exposed on the backend. All services have proper Docker Compose health checks and the proxy only starts once its dependencies are healthy.

**Developer Outcome:** The stack is more secure by default and `docker compose ps` reliably reflects actual service health — no more "started but not ready" surprises.

**FRs covered:** None directly
**NFR coverage:** NFR-07 (auth-readiness not broken by security changes)

---

### Epic 5: Quality Assurance

Test coverage is measured and meets the ≥70% threshold on both backend and frontend. Performance benchmarks from the PRD are validated against the running app. Accessibility is automatically checked via axe in the E2E suite. A security findings report is produced covering dependency CVEs, CORS, input validation, secrets hygiene, and container privileges.

**Developer Outcome:** Known quality gaps are identified and closed. The team has documented evidence that NFRs are met and no obvious security or accessibility issues remain.

**FRs covered:** None directly
**NFR coverage:** NFR-01, NFR-02, NFR-03 (validated), NFR-05, NFR-08, NFR-09

---

## Epic 1: Project Foundation & Development Environment

The full-stack monorepo is scaffolded and running locally. The Vite + React + FastAPI + PostgreSQL stack is operational via Docker Compose with Caddy proxy, the OpenAPI → Orval → TanStack Query codegen pipeline is verified end-to-end, and GitHub Actions CI is active with all 4 quality gates passing.

**Developer Outcome:** Developers can run the app locally, make changes with hot-reload, and push code with confidence that CI will catch regressions.

### Story 1.1: Monorepo Scaffold & Local Development Stack

As a **developer**,
I want the full-stack monorepo scaffolded with frontend, backend, Docker Compose, and Caddy proxy running locally,
So that I can begin feature development with a working hot-reload environment and a verified OpenAPI → Orval codegen pipeline.

**Acceptance Criteria:**

**Given** the repo is cloned and `.env` is populated from `.env.example`
**When** `docker compose up` is run
**Then** all four services start healthy: `db` (PostgreSQL 17), `backend` (FastAPI on port 8000), `frontend` (Vite dev server on port 5173), `proxy` (Caddy on port 80)
**And** `http://localhost` returns the Vite frontend without errors
**And** `http://localhost/api/openapi.json` returns the FastAPI OpenAPI spec JSON

**Given** the backend service is running
**When** a change is made to any file in `backend/app/`
**Then** uvicorn hot-reloads without a container restart

**Given** the frontend service is running
**When** a change is made to any file in `frontend/src/`
**Then** Vite HMR updates the browser without a full reload

**Given** the stack is running
**When** `npx orval` is run from `frontend/`
**Then** `frontend/src/api/generated/` is populated with typed TypeScript TanStack Query hooks matching the FastAPI OpenAPI spec

**Given** the repository
**Then** the directory structure matches the architecture spec: `frontend/`, `backend/`, `proxy/Caddyfile`, `docker-compose.yml`, `docker-compose.override.yml`, `docker-compose.prod.yml`, `.env.example`
**And** `.env.example` contains all required keys: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `CORS_ORIGINS`
**And** `frontend/src/api/generated/` is committed to the repo

---

### Story 1.2: CI Pipeline

As a **developer**,
I want GitHub Actions CI to run on every push and pull request,
So that regressions in linting, tests, and API client freshness are caught automatically before merging.

**Acceptance Criteria:**

**Given** a push or pull request to the repository
**When** GitHub Actions triggers the CI workflow (`.github/workflows/ci.yml`)
**Then** four jobs run: `backend-checks`, `frontend-checks`, `e2e`, `orval-freshness`

**Given** the `backend-checks` job runs
**When** it executes
**Then** `ruff check backend/` passes
**And** `ruff format --check backend/` passes
**And** `pytest` runs all tests and passes

**Given** the `frontend-checks` job runs
**When** it executes
**Then** `biome check frontend/` passes
**And** `vitest run` runs all tests and passes

**Given** the `e2e` job runs
**When** it executes
**Then** the full Docker Compose stack starts, all Playwright tests in `e2e/` pass, and the stack is torn down

**Given** the `orval-freshness` job runs
**When** it generates the OpenAPI spec from the FastAPI app and runs orval
**Then** `git diff --exit-code frontend/src/api/generated` exits 0 (no uncommitted drift)

**Given** any CI job fails
**Then** the workflow reports failure with clear output indicating the failing job and step

---

## Epic 2: Core Todo Management

Users can create, view, complete, and delete todos. All state persists across page reloads. New todos appear instantly (optimistic UI). Creation timestamps are visible. Active and completed todos are visually distinct. Empty state is handled.

**User Outcome:** The complete task management loop works — add a task, check it off, delete it, come back tomorrow and find it all intact.

### Story 2.1: Backend Todo API & Database

As a **developer**,
I want the Todo database model, Alembic migration, and all four REST endpoints implemented with tests,
So that the frontend has a fully working, tested API to build against.

**Acceptance Criteria:**

**Given** the backend service starts
**When** the entrypoint script runs
**Then** `alembic upgrade head` applies successfully and the `todo` table exists in PostgreSQL with columns: `id` (int PK), `text` (varchar 500), `is_completed` (bool, default false), `created_at` (timestamp, server default now)

**Given** the API is running
**When** `GET /todos` is called
**Then** it returns `200` with a JSON array of all todos as `TodoPublic` objects (`id`, `text`, `is_completed`, `created_at`)

**Given** a valid request body `{"text": "Buy milk"}`
**When** `POST /todos` is called
**Then** it returns `201` with the created `TodoPublic` object
**And** the todo is persisted in the database

**Given** a request body with empty text `{"text": ""}` or `{"text": "   "}`
**When** `POST /todos` is called
**Then** it returns `422 Unprocessable Entity`

**Given** a request body with text exceeding 500 characters
**When** `POST /todos` is called
**Then** it returns `422 Unprocessable Entity`

**Given** an existing todo with `id=1`
**When** `PATCH /todos/1` is called with `{"is_completed": true}`
**Then** it returns `200` with the updated `TodoPublic` object

**Given** an existing todo with `id=1`
**When** `DELETE /todos/1` is called
**Then** it returns `204` and the todo no longer exists in the database

**Given** a non-existent `id`
**When** `PATCH /todos/{id}` or `DELETE /todos/{id}` is called
**Then** it returns `404 Not Found`

**Given** the test suite runs
**Then** all endpoints are covered by pytest tests using an in-memory SQLite async session override via FastAPI dependency injection
**And** `aiosqlite` and `psycopg2-binary` are present as dev/test dependencies

---

### Story 2.2: Todo List View

As a **user**,
I want to see my full todo list when I open the app, with active and completed todos visually distinct and timestamps shown per item,
So that I can immediately review my current tasks and their completion state.

**Acceptance Criteria:**

**Given** the app loads
**When** the frontend fetches `GET /todos` via the Orval-generated TanStack Query hook
**Then** all todos are rendered: completed todos in a "Completed" section at the top, active todos in an "Active" section below

**Given** a completed todo
**When** it renders in the Completed section
**Then** its text has strikethrough styling and is visually dimmed (muted color)
**And** its checkbox is in a checked state

**Given** an active todo
**When** it renders in the Active section
**Then** its text has no strikethrough and uses primary text color
**And** its checkbox is in an unchecked state

**Given** each todo item
**When** it renders
**Then** the creation timestamp is visible below the todo text in secondary (muted) color, formatted as a readable date/time
**And** the timestamp uses a `<time dateTime="...">` element

**Given** no todos exist in the database
**When** the app loads
**Then** neither the "Completed" nor "Active" section labels are visible
**And** the `TodoForm` is the only element in the list area

**Given** todos exist but none are completed
**When** the app renders
**Then** the "Completed" section label does not render
**And** only the "Active" section with its todos is visible

**Given** todos exist but all are completed
**When** the app renders
**Then** the "Active" section label does not render (only `TodoForm` remains in the active area)

**Given** a page reload with existing todos in the database
**When** the app loads
**Then** all todos appear in their correct state (text, completion, timestamp)

---

### Story 2.3: Create Todo

As a **user**,
I want to type a task and submit it, with it appearing in my list instantly,
So that I can capture tasks immediately without waiting for a server round-trip.

**Acceptance Criteria:**

**Given** the app is open
**Then** a `TodoForm` is always visible at the bottom of the Active section with placeholder text "Add a task…"
**And** the input field has focus on page load

**Given** the user types text in the input and presses Enter (or clicks the submit affordance)
**When** the text is non-empty
**Then** the new todo appears immediately at the bottom of the Active section (optimistic update — before server confirmation)
**And** the input field clears and refocuses
**And** `POST /todos` is called in the background to persist the todo

**Given** the optimistic create succeeds server-side
**When** `onSettled` fires
**Then** the query cache is invalidated and refetched, confirming server state

**Given** the user attempts to submit with an empty input field
**When** Enter is pressed or the submit affordance is clicked
**Then** no todo is created and no API call is made
**And** the input field retains focus

**Given** the user types more than 500 characters
**When** typing in the input
**Then** the input stops accepting characters at the 500-character limit with no error label shown

---

### Story 2.4: Complete & Delete Todo

As a **user**,
I want to mark a todo as complete and delete todos,
So that I can track my progress and keep my list relevant.

**Acceptance Criteria:**

**Given** an active todo is visible
**When** the user clicks/taps anywhere on the todo row (or its checkbox)
**Then** the todo immediately moves to the Completed section with strikethrough + dimmed styling (optimistic update)
**And** `PATCH /todos/{id}` is called in the background with `{"is_completed": true}`

**Given** a completed todo is visible
**When** the user clicks/taps anywhere on the todo row (or its checkbox)
**Then** the todo immediately moves back to the Active section with normal styling (optimistic toggle)
**And** `PATCH /todos/{id}` is called in the background with `{"is_completed": false}`

**Given** the optimistic toggle succeeds server-side
**When** `onSettled` fires
**Then** the query cache is invalidated and refetched, confirming the server state

**Given** a todo (active or completed) is visible
**When** the user clicks/taps the trash icon on that todo's row
**Then** the todo is immediately removed from the list (optimistic delete)
**And** `DELETE /todos/{id}` is called in the background

**Given** deleting the last todo
**When** the optimistic delete fires
**Then** the list shows only the `TodoForm` with no section labels

**Given** the optimistic toggle or delete fails server-side
**When** `onError` fires
**Then** the query cache is restored to the snapshot from `onMutate`
**And** an error is surfaced for the ErrorBanner to display

**Given** the trash icon and the checkbox on any row
**Then** the trash icon click stops event propagation so it does not trigger the row toggle

---

## Epic 3: Resilience, Polish & Accessibility

The app handles every state gracefully — loading, error, and edge cases. It works on all supported browsers and devices. Theme toggle (light/dark) is available. The interface meets WCAG 2.1 AA accessibility standards. All NFR benchmarks are demonstrably met.

**User Outcome:** Users get clear, non-blocking feedback when things go wrong; they can use the app on their phone without friction; the experience is polished and accessible.

### Story 3.1: Loading & Error States

As a **user**,
I want clear feedback when data is loading or an operation fails, without the app crashing or blocking me,
So that I always understand what the app is doing and can continue working even when errors occur.

**Acceptance Criteria:**

**Given** the app loads and `GET /todos` is in flight
**When** the TanStack Query `isPending` state is true
**Then** skeleton loading rows are shown at the same height as real todo rows (no layout shift)
**And** the skeleton rows use a pulsing opacity animation
**And** the `TodoForm` is visible and usable below the skeletons — the user can begin typing before the list loads

**Given** the fetch completes successfully
**When** data arrives
**Then** skeleton rows are replaced by real todo rows with no visible jump or layout shift

**Given** `GET /todos` fails (network error or server error)
**When** the error state is set
**Then** an `ErrorBanner` renders below the header with a short label (e.g. "Network issue")
**And** the `TodoForm` remains visible and usable
**And** the `ErrorBanner` uses `role="alert"` so screen readers announce it immediately

**Given** a create, toggle, or delete mutation fails server-side
**When** `onError` fires
**Then** the `ErrorBanner` renders with a short descriptive label (e.g. "Failed to save")
**And** the UI remains interactive — the user is not blocked from attempting further actions

**Given** the error condition resolves (successful subsequent operation or query refetch)
**When** the error state clears
**Then** the `ErrorBanner` auto-dismisses without requiring user action

**Given** any unhandled client-side JavaScript error occurs
**Then** the app does not crash or render a blank page — errors are caught at the component boundary

---

### Story 3.2: Responsive Layout & Mobile Experience

As a **user**,
I want to use the app on any device — phone, tablet, or desktop — without horizontal scrolling or broken layouts,
So that I can manage my todos wherever I am.

**Acceptance Criteria:**

**Given** a viewport of 375px width (minimum supported)
**When** the app renders
**Then** all content fits within the viewport with no horizontal scrolling
**And** all interactive elements (checkbox, trash icon, input, submit) are reachable and usable

**Given** any viewport from 375px to 1280px+
**When** the app renders
**Then** the layout is a single centered column with `max-w-2xl` cap on desktop and `px-4` inset on all sizes
**And** no content overflows or is clipped at any viewport width in this range

**Given** any interactive element (checkbox, trash icon button, add button, theme toggle)
**When** measured
**Then** its effective touch target is at minimum 44×44px (WCAG 2.5.5)

**Given** a mobile device in portrait orientation
**When** the user taps the `TodoForm` input
**Then** the virtual keyboard opens and the input remains visible (input row at bottom of active section naturally stays near keyboard)

**Given** the app is tested on Chrome, Firefox, and Safari (latest stable)
**Then** all core actions — create, view, complete, delete — work correctly in all three browsers
**And** visual appearance is consistent across browsers

**Given** the `TodoRow` layout
**Then** the checkbox and trash icon are on opposite sides of the row, making accidental simultaneous activation impossible

---

### Story 3.3: Theme Toggle & Accessibility

As a **user**,
I want the app to match my system color scheme preference with a manual override, and be fully usable with keyboard and screen readers,
So that the app feels at home on my device and is accessible to all users.

**Acceptance Criteria:**

**Given** a user's OS is set to dark mode (`prefers-color-scheme: dark`)
**When** the app loads for the first time (no localStorage override)
**Then** the app renders in dark mode using the dark color tokens

**Given** a user's OS is set to light mode
**When** the app loads for the first time
**Then** the app renders in light mode

**Given** the user clicks/taps the theme toggle in the `AppHeader`
**When** toggled
**Then** the theme switches immediately (light ↔ dark)
**And** the preference is saved to `localStorage`
**And** subsequent page loads use the `localStorage` value, overriding system preference

**Given** the theme toggle button
**Then** it has a dynamic `aria-label`: "Switch to dark mode" in light mode, "Switch to light mode" in dark mode

**Given** any interactive element (theme toggle, checkboxes in TodoItem and TodoForm, delete button, submit/add button)
**When** the user hovers over it with a pointing device
**Then** the cursor changes to `cursor: pointer`

**Given** all interactive elements in the app
**When** navigated via keyboard (Tab / Shift+Tab)
**Then** all elements are reachable in a logical order with no keyboard traps
**And** all elements show a visible focus ring

**Given** the checkbox on a todo item
**Then** it has `aria-label="Mark as complete"` when unchecked and `aria-label="Mark as active"` when checked
**And** Space key toggles it (Radix UI native behavior)

**Given** an unselected checkbox in TodoItem
**When** rendered in either light or dark mode
**Then** the checkbox border is clearly visible with sufficient contrast against its background (WCAG AA minimum: 3:1 for UI components)

**Given** the placeholder checkbox in TodoForm
**When** rendered in either light or dark mode
**Then** the checkbox border remains clearly visible and the element's opacity styling does not reduce border contrast below WCAG AA threshold

**Given** the trash icon button on a todo item
**Then** it has `aria-label="Delete todo"`

**Given** the `TodoForm` input
**Then** it has `aria-label="Add a task"`

**Given** the list structure in the DOM
**Then** semantic HTML is used: `<main>`, `<header>`, `<ul>`, `<li>` for todos

**Given** all text/background color combinations
**Then** contrast ratios meet WCAG AA (4.5:1 for body text, 3:1 for UI components)

**Given** the OS has reduced motion enabled (`prefers-reduced-motion: reduce`)
**When** the checkbox animation or any row transition fires
**Then** animations are disabled or reduced to an instant state change

---

## Epic 4: Infrastructure Hardening

All containers run as non-root users. A static health endpoint is exposed on the backend. All services have proper Docker Compose health checks and the proxy only starts once its dependencies are healthy.

**Developer Outcome:** The stack is more secure by default and `docker compose ps` reliably reflects actual service health.

### Story 4.1: Non-root Container Users

As a **developer**,
I want all containers to run as non-root users,
So that a compromised container process cannot affect the host or other containers with root-level privileges.

**Acceptance Criteria:**

**Given** the backend Dockerfile
**When** the image is built
**Then** a non-root user (e.g. `appuser`) is created and set as the running user via `USER appuser`
**And** file ownership of `/app` is granted to that user before the `USER` instruction

**Given** the frontend Dockerfile
**When** the development or production stage runs
**Then** the process runs as a non-root user in both stages

**Given** any running service (`backend`, `frontend`)
**When** `docker compose exec <service> id` is run
**Then** the output does not show `uid=0(root)`

**Given** Caddy (`proxy` service)
**Then** no change is needed — Caddy's official image already runs as non-root by default

---

### Story 4.2: Backend Health Endpoint

As a **developer**,
I want a health endpoint on the backend,
So that Docker and any external monitoring can check whether the service is up without touching business logic.

**Acceptance Criteria:**

**Given** the backend service is running
**When** `GET /health` is called
**Then** it returns `200 OK` with body `{"status": "ok"}`

**Given** the Caddy proxy is running
**When** `GET /api/health` is called
**Then** it proxies to the backend and returns the same `200 OK` response

**Given** the FastAPI app
**Then** the `/health` route has `operation_id="healthCheck"` and is included in the OpenAPI spec

**Given** the backend test suite
**Then** a pytest test covers `GET /health` asserting status `200` and response body `{"status": "ok"}`

---

### Story 4.3: Docker Compose Health Checks & Service Dependencies

As a **developer**,
I want all services to declare health checks and the proxy to wait for healthy dependencies,
So that `docker compose up` reliably results in a fully operational stack rather than services starting before their dependencies are ready.

**Acceptance Criteria:**

**Given** the backend service in `docker-compose.yml`
**When** the health check runs
**Then** it calls `GET /health` (via `wget -qO- http://localhost:8000/health` or equivalent)
**And** the check is configured with `interval: 10s`, `timeout: 5s`, `retries: 5`, `start_period: 10s`

**Given** the frontend service in `docker-compose.yml`
**When** the health check runs
**Then** it verifies the dev server (or static server in prod) is responding on its port

**Given** the proxy service in `docker-compose.yml`
**When** configured with `depends_on`
**Then** it uses `condition: service_healthy` for both `backend` and `frontend`

**Given** `docker compose up` completes
**When** `docker compose ps` is run
**Then** all services (`db`, `backend`, `frontend`, `proxy`) show status `healthy`

**Given** the existing `db` health check
**Then** it remains unchanged — `pg_isready` is already correctly configured

---

## Epic 5: Quality Assurance

Test coverage is measured and meets ≥70% on both backend and frontend. Performance benchmarks from the PRD are validated against the running app. Accessibility is automatically checked via axe in the E2E suite. A security findings report is produced.

**Developer Outcome:** Known quality gaps are identified and closed. The team has documented evidence that NFRs are met and no obvious security or accessibility issues remain.

### Story 5.1: Test Coverage Analysis & Improvement

As a **developer**,
I want test coverage measured and enforced at ≥70% on both backend and frontend,
So that critical paths are verified and regressions are caught reliably.

**Acceptance Criteria:**

**Given** the backend test suite
**When** `pytest --cov=app --cov-report=term-missing` runs
**Then** a per-module coverage report is printed to stdout
**And** overall line coverage is ≥70%

**Given** the frontend test suite
**When** `vitest run --coverage` runs
**Then** a per-file coverage report is produced
**And** overall statement/line coverage is ≥70%

**Given** the CI pipeline (`backend-checks` and `frontend-checks` jobs)
**When** coverage falls below 70%
**Then** the relevant job fails with a clear coverage summary in the output

**Given** the coverage reports
**When** gaps are identified in critical paths (API endpoints, mutation hooks, error handling, utility functions)
**Then** new tests are written to cover those gaps before the story is marked complete

**Given** `pytest-cov` as a backend dev dependency and `@vitest/coverage-v8` as a frontend dev dependency
**Then** both are added to the respective dependency manifests

---

### Story 5.2: Performance Validation

As a **developer**,
I want the PRD performance benchmarks validated against the running app,
So that there is documented evidence that NFR-01, NFR-02, and NFR-03 are actually met — not just assumed.

**Acceptance Criteria:**

**Given** the app running with at least 20 todos seeded in the database
**When** a Playwright test measures time from navigation start to todos being visible (using `performance.getEntriesByType`)
**Then** the time to first meaningful render is ≤1000ms (NFR-02)

**Given** a create mutation triggered via Playwright
**When** measured from click to new todo appearing in the DOM
**Then** the UI reflects the new item in ≤200ms (optimistic update, NFR-01)

**Given** the backend API
**When** 20 sequential `GET /todos` requests are made and response times are recorded
**Then** the p95 response time is ≤500ms (NFR-03)

**Given** the performance test results
**Then** they are committed as a Playwright test in `e2e/tests/performance.spec.ts` that asserts the above thresholds
**And** the test runs as part of the standard E2E suite in CI

---

### Story 5.3: Accessibility Audit

As a **user and developer**,
I want automated accessibility checks integrated into the E2E suite and any violations fixed,
So that WCAG 2.1 AA compliance is continuously enforced rather than verified once and forgotten.

**Acceptance Criteria:**

**Given** `axe-playwright` (or `@axe-core/playwright`) is installed as an E2E dev dependency
**When** the accessibility test suite runs
**Then** it scans each major app state: loaded list, empty state, loading skeleton state, error banner visible, dark mode

**Given** any WCAG AA violation detected by axe
**When** the test runs
**Then** the test fails with a report of the specific violation, its impact level, and the affected element

**Given** a Lighthouse audit run against `http://localhost` (full Docker stack)
**When** the accessibility category is measured
**Then** the score is ≥90

**Given** any violations found during initial audit runs
**Then** they are fixed before the story is marked complete
**And** the final Lighthouse accessibility score (≥90) is documented in the story's change log

**Given** the axe tests
**Then** they live in `e2e/tests/accessibility.spec.ts` and run as part of the standard E2E suite in CI

---

### Story 5.4: Security Review & Findings Report

As a **developer**,
I want a systematic security review with a documented findings report,
So that known vulnerabilities, misconfigurations, and hygiene issues are identified and addressed.

**Acceptance Criteria:**

**Given** the backend Python dependencies
**When** `uv audit` (or `pip-audit`) runs
**Then** all known CVEs are identified
**And** any high or critical severity vulnerabilities are resolved or have a documented acceptance rationale

**Given** the frontend Node dependencies
**When** `npm audit` runs
**Then** all known CVEs are identified
**And** any high or critical severity vulnerabilities are resolved or have a documented acceptance rationale

**Given** the CORS configuration
**When** reviewed
**Then** allowed origins are explicitly allowlisted — no wildcard `*` — in the production configuration
**And** the review outcome is documented in the findings report

**Given** the API input validation
**When** reviewed
**Then** all endpoints reject empty text, oversized text (>500 chars), and malformed payloads with appropriate error codes
**And** no raw SQL is used — all DB access goes through SQLModel/SQLAlchemy ORM

**Given** the repository contents
**When** reviewed
**Then** no secrets, credentials, or `.env` files with real values are committed
**And** `.env.example` contains only placeholder values

**Given** container privilege review
**Then** the findings confirm Story 4.1 is complete (all containers non-root) and this is noted in the report

**Given** the completed review
**Then** a findings report is saved to `_bmad-output/planning-artifacts/security-findings-report.md`
**And** it documents: dependency audit results, CORS review, input validation review, secrets hygiene check, container privilege status, and any outstanding accepted risks
