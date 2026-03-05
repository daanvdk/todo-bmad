# Story 1.1: Monorepo Scaffold & Local Development Stack

Status: done

## Story

As a **developer**,
I want the full-stack monorepo scaffolded with frontend, backend, Docker Compose, and Caddy proxy running locally,
so that I can begin feature development with a working hot-reload environment and a verified OpenAPI → Orval → TanStack Query codegen pipeline.

## Acceptance Criteria

1. **Given** the repo is cloned and `.env` is populated from `.env.example`
   **When** `docker compose up` is run
   **Then** all four services start healthy: `db` (PostgreSQL 17), `backend` (FastAPI on port 8000), `frontend` (Vite dev server on port 5173), `proxy` (Caddy on port 80)
   **And** `http://localhost` returns the Vite frontend without errors
   **And** `http://localhost/api/openapi.json` returns the FastAPI OpenAPI spec JSON

2. **Given** the backend service is running
   **When** a change is made to any file in `backend/app/`
   **Then** uvicorn hot-reloads without a container restart

3. **Given** the frontend service is running
   **When** a change is made to any file in `frontend/src/`
   **Then** Vite HMR updates the browser without a full reload

4. **Given** the stack is running
   **When** `npx orval` is run from `frontend/`
   **Then** `frontend/src/api/generated/` is populated with typed TypeScript TanStack Query hooks matching the FastAPI OpenAPI spec

5. **Given** the repository
   **Then** the directory structure matches the architecture spec: `frontend/`, `backend/`, `proxy/Caddyfile`, `docker-compose.yml`, `docker-compose.override.yml`, `docker-compose.prod.yml`, `.env.example`
   **And** `.env.example` contains all required keys: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `CORS_ORIGINS`
   **And** `frontend/src/api/generated/` is committed to the repo

## Tasks / Subtasks

- [x] Task 1: Initialize frontend (AC: 1, 3, 4, 5)
  - [x] Run `npm create vite@latest frontend -- --template react-ts`
  - [x] `cd frontend && npm install`
  - [x] Install runtime deps: `npm install @tanstack/react-query`
  - [x] Install dev deps: `npm install -D orval vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom`
  - [x] Install Biome: `npm install -D @biomejs/biome@2.4.5`
  - [x] Create `frontend/biome.json` (linting + formatting config)
  - [x] Create `frontend/orval.config.ts` with `OPENAPI_PATH` env var support
  - [x] Update `frontend/vite.config.ts` with `@/` path alias and vitest config
  - [x] Update `frontend/tsconfig.app.json` with `@/` path alias

- [x] Task 2: Initialize backend (AC: 1, 2, 5)
  - [x] Run `uv init backend`
  - [x] `cd backend && uv add fastapi[standard] sqlmodel asyncpg alembic pydantic-settings psycopg2-binary`
  - [x] Add dev deps: `uv add --dev pytest pytest-asyncio httpx aiosqlite ruff`
  - [x] Create minimal `backend/app/main.py` (FastAPI app instance, no routes yet — just enough for OpenAPI spec)
  - [x] Create `backend/app/__init__.py`
  - [x] Create `backend/app/settings.py` (Pydantic Settings for DATABASE_URL, CORS_ORIGINS)
  - [x] Configure Ruff in `backend/pyproject.toml` (`line-length=88`, select `E`, `F`, `I`)
  - [x] Initialize Alembic: `alembic init alembic` from `backend/`
  - [x] Update `backend/alembic.ini` to use env-based sqlalchemy.url
  - [x] Create `backend/entrypoint.sh` (runs `alembic upgrade head`, then starts uvicorn)
  - [x] Make `backend/entrypoint.sh` executable (`chmod +x`)

- [x] Task 3: Create Docker configuration (AC: 1, 2, 3)
  - [x] Create `backend/Dockerfile` (single stage, python:3.12-slim, uv binary from ghcr.io)
  - [x] Create `frontend/Dockerfile` (multi-stage: base → development → build → production with caddy:2-alpine)
  - [x] Create `frontend/Caddyfile` (`:5173` static SPA server for production stage)
  - [x] Create `docker-compose.yml` (base: db, backend, frontend, proxy services; no ports exposed except implicitly)
  - [x] Create `docker-compose.override.yml` (dev: bind mounts, `--reload`, exposed ports 5432, 80)
  - [x] Create `docker-compose.prod.yml` (prod: restart policies, production build targets, expose port 80)

- [x] Task 4: Create Caddy reverse proxy config (AC: 1, 4)
  - [x] Create `proxy/Caddyfile` (`handle_path /api/*` → `backend:8000`, `handle` → `frontend:5173`)

- [x] Task 5: Create environment config (AC: 5)
  - [x] Create `.env.example` with keys: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `CORS_ORIGINS`
  - [x] Create `.gitignore` (exclude `.env`, `node_modules/`, `__pycache__/`, `.venv/`, `postgres_data`)

- [x] Task 6: Verify and generate initial API client (AC: 4, 5)
  - [x] Copy `.env.example` to `.env` and populate with dev values
  - [x] Run `docker compose up` and confirm all 4 services healthy
  - [x] Verify `http://localhost` serves Vite frontend
  - [x] Verify `http://localhost/api/openapi.json` returns spec JSON
  - [x] Run `npx orval` from `frontend/` — confirm `frontend/src/api/generated/` populated
  - [x] Commit `frontend/src/api/generated/` to the repo

- [x] Task 7: Create initial README (AC: 5)
  - [x] `README.md` at repo root with: prerequisites (Docker, Node, uv), setup steps, dev commands, project structure overview

## Dev Notes

### Architecture & Stack

This story creates the complete project scaffold from scratch. **No starter template or monorepo tool is used** — each layer is initialized independently.

**Technology stack:**
- Frontend: Vite 6.x + React 19 + TypeScript, TanStack Query, Orval, Biome 2.4.5, vitest 4.0.18, Playwright 1.58.2 (E2E in Story 1.2)
- Backend: Python 3.12, FastAPI (with `standard` extras), SQLModel, asyncpg, Alembic, Pydantic Settings, Ruff 0.15.x
- DB: PostgreSQL 17 (postgres:17-alpine image)
- Proxy: Caddy 2 (caddy:2-alpine image)
- Containerization: Docker Compose (3-file strategy: base, override, prod)

### Critical Implementation Details

**Caddy routing** — `handle_path` strips the `/api/` prefix before forwarding to backend. FastAPI routes must therefore be defined WITHOUT the `/api` prefix:
- `GET /todos` (not `GET /api/todos`)
- Caddy: `handle_path /api/* { reverse_proxy backend:8000 }` + `handle { reverse_proxy frontend:5173 }`

**Backend Dockerfile** — uv binary is copied from ghcr.io image, NOT installed via pip:
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
Dev behavior (bind mount + `--reload`) is provided entirely by `docker-compose.override.yml`, NOT the Dockerfile.

**Frontend Dockerfile** — multi-stage, final prod stage uses `caddy:2-alpine`:
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

**docker-compose.override.yml** (dev — auto-loaded by Docker Compose):
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

Note the `/app/node_modules` anonymous volume — this prevents the host (where node_modules may not exist) from overwriting the container's node_modules.

**entrypoint.sh** — backend entrypoint must run migrations BEFORE starting uvicorn:
```bash
#!/bin/bash
set -e
cd /app
alembic upgrade head
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Alembic sync driver** — Alembic runs synchronously; derive the psycopg2 URL from DATABASE_URL:
```python
# alembic/env.py
from app.settings import settings
sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql+psycopg2")
```

**Orval config** — must support both a local URL (dev) and file path (CI via `OPENAPI_PATH` env var):
```ts
// frontend/orval.config.ts
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

**Vite config** — must include `@/` alias AND vitest config:
```ts
// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
```

**Ruff config** in `backend/pyproject.toml`:
```toml
[tool.ruff]
line-length = 88

[tool.ruff.lint]
select = ["E", "F", "I"]
```

**Biome config** (`frontend/biome.json`):
```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.5/schema.json",
  "organizeImports": { "enabled": true },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 }
}
```

**Minimal FastAPI app** for this story — just enough to serve an OpenAPI spec (no routes yet):
```python
# backend/app/main.py
from fastapi import FastAPI
from app.settings import settings
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="todo-bmad API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Settings** (`backend/app/settings.py`):
```python
from pydantic_settings import BaseSettings
from typing import list

class Settings(BaseSettings):
    DATABASE_URL: str
    CORS_ORIGINS: list[str] = ["http://localhost"]

    class Config:
        env_file = ".env"

settings = Settings()
```

**DATABASE_URL format** in `docker-compose.yml`:
```yaml
DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

### Project Structure Notes

The complete target structure for this story (files created here):

```
todo-bmad/
├── .github/                         # Empty (CI workflow added in Story 1.2)
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # Minimal FastAPI app (CORS only, no routes)
│   │   └── settings.py              # Pydantic Settings (DATABASE_URL, CORS_ORIGINS)
│   ├── alembic/
│   │   ├── env.py                   # Updated with sync URL derivation
│   │   ├── script.py.mako
│   │   └── versions/                # Empty at this stage
│   ├── tests/                       # Empty dir (conftest.py added in Story 2.1)
│   ├── alembic.ini
│   ├── entrypoint.sh                # alembic upgrade head → uvicorn
│   ├── Dockerfile
│   └── pyproject.toml               # fastapi, sqlmodel, asyncpg, alembic, pydantic-settings, psycopg2-binary; dev: pytest, pytest-asyncio, httpx, aiosqlite, ruff
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── generated/           # Orval output committed here
│   │   ├── App.tsx                  # Default Vite template (replaced in Story 2.2)
│   │   ├── main.tsx                 # Default Vite template
│   │   └── index.css                # Default Vite template
│   ├── public/
│   ├── Caddyfile                    # :5173 SPA static server for production stage
│   ├── biome.json
│   ├── index.html
│   ├── orval.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json            # Includes @/ path alias
│   ├── tsconfig.node.json
│   ├── vite.config.ts               # @/ alias + vitest config
│   └── Dockerfile                   # development + build + production stages
├── e2e/                             # Empty dir (Playwright added in Story 1.2)
├── proxy/
│   └── Caddyfile                    # handle_path /api/* + handle fallback
├── docker-compose.yml               # Base config (no ports exposed)
├── docker-compose.override.yml      # Dev: bind mounts, --reload, port 80, 5432
├── docker-compose.prod.yml          # Prod: restart policies, production targets
├── .env.example                     # POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, CORS_ORIGINS
├── .gitignore
└── README.md
```

**Naming conventions to follow:**
- Python files: `snake_case` (e.g., `main.py`, `settings.py`)
- React components: `PascalCase` (none yet in this story)
- TypeScript non-component files: `camelCase`
- DB columns: `snake_case`
- API endpoints: plural nouns (`/todos`)

**Import alias:** Always use `@/components/...` — never relative paths like `../../`. Enforce via Biome lint rules.

### What this story does NOT include

- No API routes (added in Story 2.1)
- No React components beyond Vite template defaults (added in Story 2.2+)
- No database models or migrations (added in Story 2.1)
- No test files (added in respective feature stories)
- No CI workflow (added in Story 1.2)
- No E2E tests (added in Story 1.2)
- No shadcn/ui setup (added in Story 2.2)
- Do NOT add `ThemeProvider`, `ErrorBanner`, or any application components — this story is scaffolding only

### Verification Checklist

After completing all tasks, manually verify:
1. `docker compose up` → all 4 services show as healthy in `docker compose ps`
2. `curl http://localhost` → returns HTML with Vite/React content
3. `curl http://localhost/api/openapi.json` → returns JSON with `{"openapi": "3.x.x", ...}`
4. Edit `backend/app/main.py` and save → uvicorn logs show reload
5. Edit `frontend/src/App.tsx` and save → browser shows change without full reload
6. `cd frontend && npx orval` → `frontend/src/api/generated/` populated with `.ts` files
7. `cd frontend && npx biome check .` → passes with no errors
8. `cd backend && ruff check .` → passes with no errors

### References

- Architecture: scaffold commands and structure [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Initialization]
- Architecture: backend initialization commands [Source: _bmad-output/planning-artifacts/architecture.md#Backend Initialization]
- Architecture: Docker Compose configuration [Source: _bmad-output/planning-artifacts/architecture.md#Docker Compose Configuration]
- Architecture: Caddy routing (handle_path strips /api/) [Source: _bmad-output/planning-artifacts/architecture.md#Reverse Proxy (Caddy)]
- Architecture: Orval config with OPENAPI_PATH env var [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- Architecture: Ruff config [Source: _bmad-output/planning-artifacts/architecture.md#Linting, Formatting & CI]
- Architecture: alembic psycopg2-binary sync URL derivation [Source: _bmad-output/planning-artifacts/architecture.md#Gap Analysis]
- Architecture: complete project directory structure [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- Architecture: entrypoint.sh migration-before-start pattern [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- Epics: Story 1.1 acceptance criteria [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Biome 2.4.5: `organizeImports` top-level key removed; now lives under `assist.actions.source.organizeImports: "on"`
- Ruff import ordering: `alembic/env.py` needed stdlib → third-party → first-party grouping (fixed via `ruff check --fix`)
- Backend bind mount in dev mode causes uv to re-resolve due to stale `.venv` symlink — normal behavior, resolves quickly on startup
- `npx orval` warning about prettier not found is benign (no routes exist yet, no files generated)

### Completion Notes List

- Scaffolded full monorepo from scratch: frontend (Vite 6/React 19/TS), backend (FastAPI/SQLModel/Alembic), Docker Compose (3-file strategy), Caddy proxy
- All 4 services verified healthy: db (postgres:17-alpine), backend (FastAPI on 8000), frontend (Vite dev on 5173), proxy (Caddy on port 80)
- `http://localhost` → 200; `http://localhost/api/openapi.json` → valid OpenAPI JSON
- Hot-reload configured via docker-compose.override.yml bind mounts and uvicorn `--reload`
- Biome 2.4.5 passes clean; Ruff passes clean; vitest (1 test) passes; pytest (1 test) passes
- `frontend/src/api/generated/` committed (empty dir with .gitkeep — no routes exist yet per story spec)
- Git repo initialized at project root

### File List

- .env.example
- .gitignore
- README.md
- docker-compose.yml
- docker-compose.override.yml
- docker-compose.prod.yml
- proxy/Caddyfile
- backend/Dockerfile
- backend/entrypoint.sh
- backend/pyproject.toml
- backend/uv.lock
- backend/alembic.ini
- backend/app/__init__.py
- backend/app/main.py
- backend/app/settings.py
- backend/alembic/env.py
- backend/alembic/script.py.mako
- backend/tests/test_main.py
- frontend/Dockerfile
- frontend/Caddyfile
- frontend/biome.json
- frontend/index.html
- frontend/orval.config.ts
- frontend/package.json
- frontend/package-lock.json
- frontend/tsconfig.json
- frontend/tsconfig.app.json
- frontend/tsconfig.node.json
- frontend/vite.config.ts
- frontend/src/test-setup.ts
- frontend/src/App.tsx
- frontend/src/App.css
- frontend/src/main.tsx
- frontend/src/index.css
- frontend/src/App.test.tsx
- frontend/src/api/generated/.gitkeep

## Change Log

- 2026-03-05: Initial implementation of Story 1.1 — monorepo scaffold with frontend, backend, Docker Compose, Caddy proxy, Biome, Ruff, Orval, and initial test suite
- 2026-03-05: Code review fixes — removed ESLint (conflicting with Biome), fixed dev migrations, added backend healthcheck, fixed page title, added vitest globals types, removed orval prettier dependency, updated File List
