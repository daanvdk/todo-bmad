---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-05'
inputDocuments:
  - docs/prd.md
  - docs/prd-validation-report.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-05'
project_name: 'todo-bmad'
user_name: 'Daan'
date: '2026-03-05'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
12 FRs across three categories:
- **Todo Management** (FR-01–08): Full CRUD lifecycle — create with text (max 500 chars), view list with timestamps, toggle active/completed, delete permanently. All operations must persist across page reload.
- **UI States** (FR-09–11): Empty state, loading indicator on initial fetch, inline error message on failure without crashing the app.
- **Layout** (FR-12): All functionality accessible at 375px+ viewport with no horizontal scroll.

Architecturally, these translate to: a REST API with 4 endpoints (list, create, update, delete), a persistence layer, optimistic client-side state, and a consistent error display pattern.

**Non-Functional Requirements:**
- **Performance**: UI reflects actions within 200ms (NFR-01); initial list renders within 1s for ≤100 todos (NFR-02); API p95 ≤500ms (NFR-03). Drives optimistic UI strategy and lightweight backend.
- **Reliability**: Data durable across page reload (NFR-04); client errors never crash the app (NFR-05). Drives error boundary strategy and persistent server storage.
- **Maintainability**: Unfamiliar developer can locate and modify any feature area within 4 hours (NFR-06). Drives clear separation of concerns and conventional project structure.
- **Architectural constraint**: Must not block future auth/multi-user addition (NFR-07). Drives API design (stateless, user-ID-ready data model), no global mutable state singletons.
- **Compatibility**: Chrome, Firefox, Safari latest; mobile 375px+ (NFR-08/09).

**Scale & Complexity:**
- Primary domain: Full-stack web (SPA + REST API + persistence layer)
- Complexity level: Low — single-entity CRUD, single user, no real-time requirements, no auth in v1
- Estimated architectural components: Frontend (React SPA), Backend API (REST), Persistence (server-side DB), optional deployment layer

### Technical Constraints & Dependencies

- **Frontend stack pre-decided** (UX spec): React + TypeScript, shadcn/ui + Tailwind CSS, system-font stack, localStorage for theme
- **No authentication in v1** — but data model and API must be structured to accept a `userId` in future without breaking changes
- **No offline requirement** — standard network-connected usage assumed
- **Single-page, single-view** — no routing required for v1
- **No real-time/WebSocket** — optimistic UI provides the "instant" feel; background server sync is fire-and-forget with inline error on failure

### Cross-Cutting Concerns Identified

1. **Optimistic UI + error rollback**: Every mutation (create, complete, delete) updates UI immediately and syncs to server in background. Failed syncs surface an inline `ErrorBanner` — but UX spec defers rollback to retry/reload, not automatic state reversion. This pattern must be consistent across all three mutation types.
2. **Auth-readiness**: API routes and data schema must be designed so a `userId` field and auth middleware can be introduced without restructuring. No hardcoded single-user assumptions in the persistence layer.
3. **Error handling**: Non-blocking inline error display across all async operations. Needs a single consistent error state management approach.
4. **Accessibility (WCAG 2.1 AA)**: Applies to every interactive component — keyboard nav, focus management, `aria-label`s, `role="alert"` on errors, `prefers-reduced-motion` on animations.
5. **Theme (light/dark)**: All components consume theme tokens from CSS custom properties — ThemeProvider wraps the entire app. No component manages its own theme state.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web: Vite SPA (React + TypeScript) + FastAPI (Python) + PostgreSQL,
coordinated with Docker Compose and fronted by a Caddy reverse proxy.

### No Monorepo Starter Used

No single CLI covers this stack. Each layer is initialized independently and
composed via Docker Compose.

### Project Repository Structure

```
todo-bmad/
├── frontend/                    # Vite + React + TypeScript
├── backend/                     # Python + FastAPI + SQLModel
├── proxy/
│   └── Caddyfile                # Shared reverse proxy config (dev + prod)
├── docker-compose.yml           # Base shared config
├── docker-compose.override.yml  # Dev overrides (auto-loaded)
├── docker-compose.prod.yml      # Prod overrides
└── .env.example                 # Committed env template (no secrets)
```

### Frontend Initialization

**Command:**
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
npm install @tanstack/react-query
npm install -D orval
```

**Orval config (`frontend/orval.config.ts`):**
```ts
export default {
  'todo-api': {
    input: 'http://localhost/api/openapi.json',
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      client: 'react-query',
      prettier: true,
    },
  },
}
```

**Frontend Dockerfile (multi-stage — dev + prod in one file):**
```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json .
RUN npm ci

FROM base AS development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "--port", "5173"]

FROM base AS build
COPY . .
RUN npm run build

FROM caddy:2-alpine AS production
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 5173
```

**`frontend/Caddyfile` (SPA static serving — same port as dev server):**
```
:5173 {
    root * /srv
    try_files {path} /index.html
    file_server
}
```

### Backend Initialization

**Command (using uv):**
```bash
uv init backend
cd backend
uv add fastapi[standard] sqlmodel asyncpg alembic pydantic-settings
```

**Structure:**
```
backend/
├── app/
│   ├── main.py           # FastAPI app, router registration
│   ├── models.py         # SQLModel table models
│   ├── routes/
│   │   └── todos.py      # Todo CRUD endpoints
│   ├── database.py       # Async engine + session dependency
│   └── settings.py       # Pydantic Settings (reads from env)
├── alembic/              # DB migrations
├── pyproject.toml
└── Dockerfile
```

**Backend Dockerfile (single stage — dev/prod behavior via docker-compose):**
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY app/ ./app/
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Dev behavior (bind mount + `--reload`) is provided entirely by `docker-compose.override.yml`.

### Reverse Proxy (Caddy)

**`proxy/Caddyfile` (shared — identical for dev and prod):**
```
:80 {
    handle_path /api/* {
        reverse_proxy backend:8000
    }
    handle {
        reverse_proxy frontend:5173
    }
}
```

`handle_path` strips `/api/` before forwarding to the backend, so FastAPI routes are
defined without the `/api` prefix (e.g., `GET /todos`, not `GET /api/todos`).

### Docker Compose Configuration

**`docker-compose.yml` (base):**
```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "${POSTGRES_USER}"]
      interval: 5s
      retries: 5

  backend:
    build:
      context: ./backend
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend

  proxy:
    image: caddy:2-alpine
    volumes:
      - ./proxy/Caddyfile:/etc/caddy/Caddyfile:ro
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
```

**`docker-compose.override.yml` (dev — auto-loaded):**
```yaml
services:
  db:
    ports:
      - "5432:5432"

  backend:
    volumes:
      - ./backend:/app
    command: uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      target: development
    volumes:
      - ./frontend:/app
      - /app/node_modules

  proxy:
    ports:
      - "80:80"
```

**`docker-compose.prod.yml` (prod):**
```yaml
services:
  db:
    restart: unless-stopped

  backend:
    restart: unless-stopped

  frontend:
    build:
      target: production

  proxy:
    ports:
      - "80:80"
    restart: unless-stopped
```

**Usage:**
```bash
# Development (override.yml auto-loaded)
docker compose up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### OpenAPI Client Regeneration Workflow

```bash
# With proxy running, regenerate frontend API client:
npx orval
```

FastAPI exposes `/openapi.json` → Caddy forwards `/api/openapi.json` → Orval reads it
and regenerates typed TanStack Query hooks into `frontend/src/api/generated/`.

### Note on Testing

Testing infrastructure (pytest for backend, vitest for frontend, Playwright for E2E)
will be covered as an architectural decision in the next step.

### Note: Project Initialization as First Story

Scaffolding the frontend, backend, Docker Compose setup, and verifying the
OpenAPI → Orval codegen flow should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation):**
- SQLModel split model structure · Test database strategy · CI/CD pipeline shape

**Important (shape architecture):**
- Optimistic update pattern · Orval freshness enforcement · Linting/formatting toolchain

**Deferred (post-MVP):**
- Authentication · API versioning · Dedicated logging service

---

### Data Architecture

**SQLModel split model pattern**

Four classes per entity — prevents accidentally exposing DB-only fields in API responses:

```python
class TodoBase(SQLModel):          # shared fields (text, completed, created_at)
class TodoCreate(TodoBase): pass   # POST request body
class TodoPublic(TodoBase):        # response schema (id included, internals excluded)
    id: int
class Todo(TodoBase, table=True):  # DB table definition
    id: int | None = Field(default=None, primary_key=True)
```

**Auth-readiness:** No `user_id` in v1. When auth lands, add it via an Alembic migration — a trivial change that does not require restructuring any existing code.

**Migrations:** Alembic with `--autogenerate` against the `Todo` table model. Migration files committed to the repo. Applied on container startup via an entrypoint script before uvicorn starts.

**Async database session:** `AsyncSession` from SQLAlchemy via `asyncpg` driver. Session provided as a FastAPI dependency (`Depends(get_session)`).

---

### Authentication & Security

**No auth in v1.** CORS is largely a non-issue in both dev and prod since all traffic routes through Caddy on port 80 (same origin). FastAPI's `CORSMiddleware` is configured via `pydantic-settings` to allow an explicit origin allowlist — permissive in dev (read from `.env`), locked down in prod.

---

### API & Communication

**REST, no versioning.** Routes are defined without a `/v1/` prefix. If versioning is needed in future, it can be introduced at the Caddy layer without changing FastAPI route definitions.

**Error format:** FastAPI default — `{"detail": "..."}` for all errors. Sufficient for the single-client v1 scope.

**OpenAPI spec:** FastAPI auto-generates `/openapi.json`. Caddy exposes it at `/api/openapi.json`. Orval reads this to generate the frontend client.

---

### Frontend Architecture

**Local UI state:** Plain React `useState` — sufficient for input field values, error display, and theme toggle. No global state library needed.

**Optimistic updates:** TanStack Query mutation lifecycle hooks:
- `onMutate`: apply optimistic update to query cache, save rollback snapshot
- `onError`: restore snapshot from `onMutate`
- `onSettled`: always invalidate and refetch to sync with server truth

Applied consistently to all three mutations: create, toggle, delete.

**Generated API client:** Orval generates typed TanStack Query hooks into `frontend/src/api/generated/`. This directory is committed to the repo. Regenerate with:
```bash
npx orval
```
The generated files are never edited by hand.

**Orval config** accepts either a URL (local dev with stack running) or a file path (CI):
```ts
// orval.config.ts
export default {
  'todo-api': {
    input: process.env.OPENAPI_PATH ?? 'http://localhost/api/openapi.json',
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      client: 'react-query',
      prettier: true,
    },
  },
}
```

---

### Testing

**Backend — pytest**

| Package | Role |
|---|---|
| `pytest` | Test runner |
| `pytest-asyncio` | Async test support |
| `httpx` | Async test client (FastAPI's `TestClient` wrapper) |

Test database: SQLite in-memory (`:memory:`) via SQLModel — no PostgreSQL container needed for unit/integration tests. Async session overridden via FastAPI dependency override in test fixtures.

**Frontend — vitest**

| Package | Version | Role |
|---|---|---|
| `vitest` | 4.0.18 | Test runner (Vite-native) |
| `@testing-library/react` | latest | Component testing |
| `@testing-library/user-event` | latest | User interaction simulation |
| `@testing-library/jest-dom` | latest | DOM matchers |
| `jsdom` | latest | Browser environment |

**E2E — Playwright**

| Package | Version | Role |
|---|---|---|
| `@playwright/test` | 1.58.2 | E2E test runner |

E2E tests run against the full Docker Compose stack. Tests cover the five core user journeys from the PRD.

---

### Linting, Formatting & CI

**Backend — Ruff 0.15.x**

Handles both linting and formatting for Python. Configured in `pyproject.toml`:
```toml
[tool.ruff]
line-length = 88
[tool.ruff.lint]
select = ["E", "F", "I"]  # pycodestyle, pyflakes, isort
```

**Frontend — Biome 2.4.5**

Handles linting and formatting for TypeScript/JavaScript. Replaces ESLint + Prettier. Configured in `biome.json`.

**GitHub Actions CI pipeline** (`.github/workflows/ci.yml`):

| Job | Steps |
|---|---|
| `backend-checks` | ruff check · ruff format --check · pytest |
| `frontend-checks` | biome check · vitest run |
| `e2e` | docker compose up · playwright test · docker compose down |
| `orval-freshness` | generate spec from FastAPI app · run orval against file · git diff --exit-code |

**Orval freshness job** — no committed snapshot; spec generated ephemerally:
```yaml
orval-freshness:
  steps:
    - name: Generate OpenAPI spec
      run: cd backend && uv run python -c "import json; from app.main import app; print(json.dumps(app.openapi()))" > openapi.json
    - name: Regenerate client
      run: cd frontend && OPENAPI_PATH=../backend/openapi.json npx orval
    - name: Check for drift
      run: git diff --exit-code frontend/src/api/generated
```

---

### Infrastructure & Deployment

**Logging:** Uvicorn access logs (stdout) + Python stdlib `logging` for application events. All container logs collected via `docker compose logs`. No dedicated logging service for v1.

**Environment configuration:** All secrets and environment-specific values via `.env` files (not committed). `.env.example` committed with all required keys and placeholder values.

## Implementation Patterns & Consistency Rules

### Naming Conventions

**Database:**
- Table names: singular, lowercase (`todo`)
- Column names: `snake_case` (`created_at`, `is_completed`)

**API endpoints:**
- Plural resource nouns: `/todos`, `/todos/{id}`
- HTTP status codes: `200` GET/PATCH · `201` POST · `204` DELETE · `422` validation · `404` not found

**JSON fields:**
- `snake_case` throughout — FastAPI default, no Pydantic alias generator
- Orval faithfully generates `snake_case` TypeScript types from the spec
- No conversion layer anywhere in the stack

**Files and directories:**
- Python: `snake_case` (`todo_routes.py`, `database.py`)
- React components: `PascalCase` (`TodoItem.tsx`, `TodoSection.tsx`)
- Non-component TypeScript: `camelCase` (`useTodos.ts`)

### Structure Patterns

**Test placement:**
- Backend: `tests/` directory mirroring `app/` structure
- Frontend: co-located (`TodoItem.test.tsx` next to `TodoItem.tsx`)
- E2E: `e2e/` directory at repo root

**Frontend src layout:**
```
frontend/src/
├── api/
│   └── generated/        # Orval output — never edited by hand
├── components/           # React components
├── hooks/                # Custom hooks (non-generated)
├── lib/                  # Utilities
└── main.tsx
```

**Import paths:** Vite `@/` alias maps to `src/` — always use `@/components/...`,
never relative `../../` paths.

### Process Patterns

**Generated API client:**
- `frontend/src/api/generated/` is committed but never edited by hand
- Regenerate with `npx orval` after any backend API change
- Use Orval-generated query key functions (e.g. `getTodosQueryKey()`) for all
  `queryClient` cache operations — never define manual key arrays

**Optimistic update pattern** (applied consistently to all mutations):
```ts
onMutate: async (variables) => {
  await queryClient.cancelQueries({ queryKey: getTodosQueryKey() })
  const snapshot = queryClient.getQueryData(getTodosQueryKey())
  queryClient.setQueryData(getTodosQueryKey(), /* optimistic update */)
  return { snapshot }
},
onError: (_, __, context) => {
  queryClient.setQueryData(getTodosQueryKey(), context?.snapshot)
},
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: getTodosQueryKey() })
},
```

**Error surfacing:** failed mutations set local `error` state; `ErrorBanner` reads it.
No global error store.

### Enforcement

Ruff and Biome enforce naming and formatting automatically. The `orval-freshness` CI
job enforces that generated code is never stale. Import alias usage enforced via Biome
lint rules.

## Project Structure & Boundaries

### Complete Project Directory Structure

```
todo-bmad/
├── .github/
│   └── workflows/
│       └── ci.yml                    # backend-checks, frontend-checks, e2e, orval-freshness
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app, CORS middleware, router registration
│   │   ├── models.py                 # TodoBase, TodoCreate, TodoPublic, Todo (table)
│   │   ├── database.py               # Async engine, AsyncSession, get_session dependency
│   │   ├── settings.py               # Pydantic Settings (DATABASE_URL, CORS_ORIGINS)
│   │   └── routes/
│   │       ├── __init__.py
│   │       └── todos.py              # GET /todos, POST /todos, PATCH /todos/{id}, DELETE /todos/{id}
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/                 # Migration files (committed)
│   ├── tests/
│   │   ├── conftest.py               # Async test client, in-memory SQLite session override
│   │   └── routes/
│   │       └── test_todos.py         # Tests for all Todo CRUD endpoints
│   ├── alembic.ini
│   ├── entrypoint.sh                 # alembic upgrade head → uvicorn
│   ├── Dockerfile
│   └── pyproject.toml                # fastapi, sqlmodel, asyncpg, alembic, pydantic-settings, ruff
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── generated/            # Orval output — never edited by hand
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui components (Checkbox, Input, Button, Skeleton)
│   │   │   ├── AppHeader.tsx         # Title + theme toggle (FR: light/dark mode)
│   │   │   ├── AppHeader.test.tsx
│   │   │   ├── ErrorBanner.tsx       # Inline non-blocking error display (FR-11)
│   │   │   ├── ErrorBanner.test.tsx
│   │   │   ├── TodoInputRow.tsx      # Inline create form, Enter to submit (FR-01, FR-02)
│   │   │   ├── TodoInputRow.test.tsx
│   │   │   ├── TodoItem.tsx          # Toggle + delete per todo (FR-05, FR-06, FR-07)
│   │   │   ├── TodoItem.test.tsx
│   │   │   ├── TodoRow.tsx           # Shared layout primitive (checkbox|content|action)
│   │   │   ├── TodoRow.test.tsx
│   │   │   ├── TodoSection.tsx       # Labeled group (Completed / Active) (FR-06, FR-09)
│   │   │   └── TodoSection.test.tsx
│   │   ├── hooks/
│   │   │   └── useTheme.ts           # System preference detection + localStorage toggle
│   │   ├── lib/
│   │   │   └── utils.ts              # Tailwind class helpers (shadcn/ui cn utility)
│   │   ├── App.tsx                   # Root composition: ThemeProvider + AppHeader + TodoSections
│   │   ├── App.test.tsx              # Integration: full todo lifecycle
│   │   ├── main.tsx                  # React root, QueryClientProvider
│   │   └── index.css                 # Tailwind directives + shadcn/ui CSS custom properties
│   ├── public/
│   ├── Caddyfile                     # :5173 static file server for production stage
│   ├── biome.json                    # Linting + formatting config
│   ├── index.html
│   ├── orval.config.ts               # OPENAPI_PATH env var or http://localhost/api/openapi.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts                # @/ path alias, vitest config
│   └── Dockerfile                    # development + build + production (caddy:2-alpine) stages
├── e2e/
│   ├── tests/
│   │   └── todos.spec.ts             # Five user journeys from PRD (create, view, complete, delete, mobile)
│   ├── playwright.config.ts          # baseURL: http://localhost, full Docker stack
│   └── package.json                  # @playwright/test
├── proxy/
│   └── Caddyfile                     # handle_path /api/* → backend:8000 | /* → frontend:5173
├── docker-compose.yml                # db, backend, frontend, proxy (base)
├── docker-compose.override.yml       # Dev: bind mounts, --reload, exposed ports
├── docker-compose.prod.yml           # Prod: restart policies, production build targets
├── .env.example                      # POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, CORS_ORIGINS
├── .gitignore
└── README.md
```

### Architectural Boundaries

**API Boundary (Caddy → Backend)**
- All requests enter via Caddy on `:80`
- `handle_path /api/*` strips prefix, forwards to `backend:8000` — FastAPI routes use no `/api` prefix
- FastAPI endpoints:
  - `GET    /todos`        → list all (FR-03, FR-04, FR-08, FR-10)
  - `POST   /todos`        → create (FR-01, FR-02)
  - `PATCH  /todos/{id}`   → toggle completed (FR-05)
  - `DELETE /todos/{id}`   → delete (FR-07)

**Frontend Component Boundary**
```
main.tsx
└── QueryClientProvider
    └── App.tsx
        ├── useTheme (hook) → ThemeProvider context on <html>
        ├── AppHeader          — theme toggle
        ├── ErrorBanner        — reads mutation error state
        ├── TodoSection (Completed)
        │   └── TodoItem[]     — toggle + delete mutations
        └── TodoSection (Active)
            ├── TodoItem[]     — toggle + delete mutations
            └── TodoInputRow   — create mutation
```

**Data Boundary (Backend → DB)**
- `get_session` dependency injects `AsyncSession` per request
- All DB access via SQLModel/SQLAlchemy — no raw SQL
- Alembic owns schema migrations — never modify table structure outside a migration

### Requirements to Structure Mapping

| FR | Location |
|---|---|
| FR-01, FR-02 (create, validate) | `TodoInputRow.tsx` + `POST /todos` |
| FR-03 (immediate appearance) | Optimistic update in `TodoInputRow.tsx` via `onMutate` |
| FR-04 (timestamps) | `Todo.created_at` in `models.py`, rendered in `TodoItem.tsx` |
| FR-05, FR-06 (toggle, visual state) | `TodoItem.tsx` + `PATCH /todos/{id}` |
| FR-07 (delete) | `TodoItem.tsx` + `DELETE /todos/{id}` |
| FR-08 (persistence) | PostgreSQL via `database.py` + Alembic migrations |
| FR-09 (empty state) | `TodoSection.tsx` conditional render |
| FR-10 (loading state) | TanStack Query `isPending` → `Skeleton` in `TodoSection.tsx` |
| FR-11 (error state) | `ErrorBanner.tsx` + mutation `onError` handlers |
| FR-12 (responsive) | Tailwind `max-w-2xl mx-auto px-4` in `App.tsx` |

### Data Flow

```
User action
  → React component
  → Orval-generated TanStack Query mutation
  → onMutate: optimistic cache update
  → HTTP request via Caddy (:80/api/*)
  → FastAPI route handler
  → AsyncSession → PostgreSQL
  → Response → TanStack Query cache
  → onSettled: invalidate + refetch
  → React re-render
```

## Architecture Validation Results

### Coherence Validation ✅

All technology choices are compatible. FastAPI + SQLModel + asyncpg form a coherent
async Python stack from the same author ecosystem. Vite + React + TanStack Query + Orval
form a coherent typed frontend stack where the API contract flows automatically from
backend to frontend. snake_case JSON throughout eliminates any conversion layer. Docker
Compose + Caddy unify the networking model across dev and prod.

### Requirements Coverage ✅

All 12 functional requirements and 9 non-functional requirements are architecturally
supported. See Requirements to Structure Mapping in the Project Structure section for
the complete FR → file mapping.

NFR-07 (auth-readiness) is explicitly preserved: split SQLModel models prevent accidental
field exposure, no `user_id` in v1 but the migration path is a single Alembic autogenerate
step, and the stateless REST API accepts auth middleware without restructuring.

### Implementation Readiness ✅

Critical decisions are documented with rationale. Naming conventions, file structure,
and process patterns (optimistic updates, error surfacing, query key usage) are specified
concretely enough that independent AI agents will produce compatible code.

### Gap Analysis

**Important — resolved:**

1. **`ThemeProvider.tsx` added to structure** — UX spec defines this as a component
   that applies the `dark` class to `<html>` and exposes theme context.
   Location: `frontend/src/components/ThemeProvider.tsx`
   Companion hook: `frontend/src/hooks/useTheme.ts`

2. **`aiosqlite` test dependency** — async SQLite in-memory tests require this driver.
   Add to `pyproject.toml` dev dependencies:
   `dev = ["pytest", "pytest-asyncio", "httpx", "aiosqlite"]`

3. **`psycopg2-binary` for Alembic** — Alembic migrations run synchronously (no async
   needed — migrations are one-shot CLI operations with no concurrency benefit from async).
   Use `psycopg2-binary` as the Alembic driver and derive the sync URL from `DATABASE_URL`:
   ```python
   # alembic/env.py
   sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql+psycopg2")
   ```
   Single source of truth in the environment, no special async Alembic configuration needed.

### Architecture Completeness Checklist

- [x] Project context and requirements analyzed
- [x] Technology stack fully specified with current versions
- [x] Docker Compose strategy (dev + prod) defined
- [x] Reverse proxy (Caddy) routing defined
- [x] Data model pattern (split SQLModel) defined
- [x] API contract (REST, snake_case, FastAPI defaults) defined
- [x] OpenAPI → Orval → TanStack Query pipeline defined
- [x] Optimistic update pattern defined and consistent
- [x] Error handling pattern defined end-to-end
- [x] Testing strategy (pytest + vitest + Playwright) defined
- [x] CI pipeline (GitHub Actions, 4 jobs) defined
- [x] Linting/formatting toolchain (ruff + biome) defined
- [x] Naming conventions established across all layers
- [x] Complete project directory structure defined
- [x] All FRs mapped to specific files
- [x] Auth-readiness verified (NFR-07)
- [x] All gaps identified and resolved

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence: High**

**Key strengths:**
- OpenAPI → Orval pipeline eliminates an entire class of frontend/backend contract bugs
- Optimistic update pattern specified consistently for all three mutations
- Caddy as unified proxy means same-origin in all environments — no CORS complexity
- Split SQLModel models protect against accidental field exposure as complexity grows
- Ephemeral Orval freshness check in CI enforces contract discipline without snapshot debt
- Alembic uses standard synchronous driver — no unnecessary complexity

**Deferred to post-MVP:**
- Authentication and multi-user support (NFR-07 confirms path is clear)
- API versioning (introducible at Caddy layer without touching FastAPI routes)
- Dedicated logging/monitoring service

### Implementation Handoff

**First implementation story:** Scaffold the monorepo — initialize frontend (`create vite`),
backend (`uv init`), Docker Compose files, Caddy config, and verify the full
OpenAPI → Orval → TanStack Query codegen pipeline end-to-end.

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Never edit `frontend/src/api/generated/` by hand — regenerate with `npx orval`
- Use Orval-generated query key functions for all cache operations
- Apply the optimistic update pattern (onMutate/onError/onSettled) to all mutations
- All DB schema changes go through Alembic migrations — never modify table structure directly
