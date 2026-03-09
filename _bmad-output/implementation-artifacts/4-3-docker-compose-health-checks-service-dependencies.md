# Story 4.3: Docker Compose Health Checks & Service Dependencies

Status: done

## Story

As a **developer**,
I want all services to declare health checks and the proxy to wait for healthy dependencies,
So that `docker compose up` reliably results in a fully operational stack rather than services starting before their dependencies are ready.

## Acceptance Criteria

1. **Given** the backend service in `docker-compose.yml` **When** the health check runs **Then** it calls `GET /health` (via `curl -f http://localhost:8000/health`) **And** the check is configured with `interval: 5s`, `timeout: 5s`, `retries: 5`, `start_period: 10s`

2. **Given** the frontend service in `docker-compose.yml` **When** the health check runs **Then** it verifies the dev server (or static server in prod) is responding on its port

3. **Given** the proxy service in `docker-compose.yml` **When** configured with `depends_on` **Then** it uses `condition: service_healthy` for both `backend` and `frontend`

4. **Given** `docker compose up` completes **When** `docker compose ps` is run **Then** all services (`db`, `backend`, `frontend`, `proxy`) show status `healthy`

5. **Given** the existing `db` health check **Then** it remains unchanged — `pg_isready` is already correctly configured

## Tasks / Subtasks

- [x] Update backend healthcheck in `docker-compose.yml` (AC: #1)
  - [x] Change test command from `/openapi.json` to `/health` endpoint
  - [x] Update timing: `interval: 10s`, `timeout: 5s`, `retries: 5`, `start_period: 10s`
- [x] Add frontend healthcheck to `docker-compose.yml` (AC: #2)
  - [x] Use `wget -q http://localhost:5173/` (works for both Vite dev server and Caddy static prod)
  - [x] Set appropriate timing parameters
- [x] Update proxy `depends_on` in `docker-compose.yml` (AC: #3)
  - [x] Change from simple list to condition-based: `condition: service_healthy` for `backend` and `frontend`
- [x] Verify all four services show `healthy` after `docker compose up` (AC: #4)
  - [x] Run `docker compose up --build -d` and wait for services
  - [x] Run `docker compose ps` to confirm all show `healthy`
- [x] Run all three test layers and linter before reporting done

## Dev Notes

### What's currently in docker-compose.yml (and what needs to change)

**`db` — leave unchanged:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
  interval: 5s
  timeout: 5s
  retries: 5
```
This is already correct. Do NOT modify.

**`backend` — update healthcheck (story 4.2 added `/health`; now use it here):**

Current (uses `/openapi.json`, wrong timing):
```yaml
healthcheck:
  test: ["CMD-SHELL", "python -c 'import urllib.request; urllib.request.urlopen(\"http://localhost:8000/openapi.json\")'"]
  interval: 5s
  timeout: 5s
  retries: 5
```

Replace with:
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:8000/health"]
  interval: 5s
  timeout: 5s
  retries: 5
  start_period: 10s
```

Why `curl`: All service images install `curl` for consistent healthcheck tooling across the stack. This avoids fragile Python one-liners and gives uniform diagnostics.

Why `/health` not `/openapi.json`: The `/health` endpoint (added in story 4.2) is a static response with no DB dependency — it returns `{"status": "ok"}` immediately. `/openapi.json` is heavier and semantically wrong for a health check.

**`frontend` — add healthcheck (currently has none):**

The frontend uses `node:22-alpine` in dev and `caddy:2-alpine` in production. `curl` is installed in both stages for healthcheck use.

Add:
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:5173/"]
  interval: 5s
  timeout: 5s
  retries: 5
  start_period: 5s
```

The base `start_period: 5s` is appropriate for Caddy (fast startup). The dev override sets `start_period: 30s` because the Vite dev server does a one-time build/transform pass on startup that can take 10–20 seconds.

**`proxy` — change `depends_on` from simple list to condition-based:**

Current (does not wait for healthy):
```yaml
depends_on:
  - frontend
  - backend
```

Replace with:
```yaml
depends_on:
  backend:
    condition: service_healthy
  frontend:
    condition: service_healthy
```

This ensures Caddy only starts routing traffic after both upstream services are genuinely ready to serve requests.

### Complete final docker-compose.yml for reference

```yaml
services:
  db:
    build:
      context: ./db
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      CORS_ORIGINS: ${CORS_ORIGINS}
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8000/health"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:5173/"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 5s
    depends_on:
      backend:
        condition: service_healthy

  proxy:
    build:
      context: ./proxy
    depends_on:
      backend:
        condition: service_healthy
      frontend:
        condition: service_healthy

volumes:
  postgres_data:
```

### No Alembic migration, no frontend client regeneration

This story is pure Docker Compose configuration — no application code changes, no API changes, no DB schema changes. The `/health` endpoint already exists from story 4.2.

### No E2E test needed

This story has no user-visible changes. The acceptance criterion "all services show `healthy`" is an operational verification done by running `docker compose ps` — it's not a Playwright user flow. No `e2e/tests/` file is needed for this story.

### Testing approach

After making the changes:
1. `docker compose down -v` — clean teardown
2. `docker compose up --build -d` — rebuild and start
3. Wait ~60 seconds for all services to start and pass health checks
4. `docker compose ps` — verify all four services show `(healthy)`
5. Run backend tests: `cd backend && uv run pytest`
6. Run frontend unit tests: `cd frontend && npx vitest run`
7. Run E2E tests: `cd e2e && npx playwright test`
8. Run linters (no application code changed, but good habit): `cd backend && uv run ruff format . && uv run ruff check --fix .`

### Learnings from story 4.2 (previous story)

- The `/health` endpoint lives in `backend/app/main.py` (inline, no separate router file was created — Option A was chosen)
- Backend tests run via `cd backend && uv run pytest` (not via docker)
- The dev override sets `user: root` for backend and frontend — this has no impact on health checks (HTTP endpoints respond regardless of running user)
- Caddy routing: `handle_path /api/*` strips the prefix, so `/api/health` via proxy → `/health` on backend. This is already working from story 4.2.

### Learnings from story 4.1 (non-root containers)

- `docker-compose.override.yml` sets `user: root` for backend and frontend (for bind-mount HMR) — this is by design and must remain unchanged
- The `db` uses a custom build (`context: ./db`) rather than `image: postgres:17-alpine` — when modifying `docker-compose.yml`, preserve this `build` directive

### Project Structure Notes

- **Only file to modify:** `docker-compose.yml` — three targeted changes only
- **Do NOT touch:**
  - `docker-compose.override.yml` — dev overrides not relevant to health checks
  - `docker-compose.prod.yml` — prod restart policies unaffected
  - Any backend application code
  - Any frontend source files
  - Any test files (no new tests needed)

### References

- Story 4.3 acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md#Story-4.3]
- Epic 4 objective: [Source: _bmad-output/planning-artifacts/epics.md#Epic-4]
- Backend health endpoint (added in 4.2): `backend/app/main.py`
- Architecture Docker Compose config: [Source: _bmad-output/planning-artifacts/architecture.md#Docker-Compose-Configuration]
- Current docker-compose.yml: `docker-compose.yml`
- Current override: `docker-compose.override.yml`
- Frontend Dockerfile stages: `frontend/Dockerfile`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Installed curl in backend (`python:3.12-slim`), frontend (`node:22-alpine`, `caddy:2-alpine`), and proxy (`caddy:2-alpine`) Dockerfiles for consistent healthcheck tooling
- Updated backend healthcheck: `curl -f http://localhost:8000/health`, `interval: 5s`, `timeout: 5s`, `retries: 5`, `start_period: 10s`
- Added frontend healthcheck: `curl -f http://localhost:5173/`, `interval: 5s`, `start_period: 5s` in base; `start_period: 30s` override for Vite dev server
- Added proxy healthcheck: `curl -f http://localhost:2019/config/` (Caddy admin API — checks Caddy process only, no upstream dependency), `interval: 5s`, `start_period: 5s`
- Updated proxy `depends_on`: changed from simple list to condition-based `service_healthy` for both `backend` and `frontend`
- Verified: all four services (`db`, `backend`, `frontend`, `proxy`) show `(healthy)` via `docker compose ps`
- All tests pass: 13 backend, 61 frontend unit, 72 E2E

### File List

- `docker-compose.yml`
- `docker-compose.override.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `proxy/Dockerfile`

### Change Log

- 2026-03-09: Implemented story 4.3 — installed curl in all Dockerfiles; updated backend healthcheck to use `curl -f /health`; added frontend and proxy healthchecks; updated proxy `depends_on` to condition-based `service_healthy`; set `interval: 5s` across all checks; frontend `start_period: 30s` in dev override
