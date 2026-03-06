# Story 1.2: CI Pipeline

Status: done

## Story

As a **developer**,
I want GitHub Actions CI to run on every push and pull request,
so that regressions in linting, tests, and API client freshness are caught automatically before merging.

## Acceptance Criteria

1. **Given** a push to `main` or a pull request to any branch
   **When** GitHub Actions triggers the CI workflow (`.github/workflows/ci.yml`)
   **Then** four jobs run: `backend-checks`, `frontend-checks`, `e2e-checks`, `orval-freshness`

2. **Given** the `backend-checks` job runs
   **When** it executes
   **Then** `ruff check backend/` passes
   **And** `ruff format --check backend/` passes
   **And** `pytest` runs all tests and passes

3. **Given** the `frontend-checks` job runs
   **When** it executes
   **Then** `biome check frontend/` passes
   **And** `vitest run` runs all tests and passes

4. **Given** the `e2e-checks` job runs
   **When** it executes
   **Then** the production Docker Compose stack starts (via `docker-compose.yml` + `docker-compose.prod.yml`), Biome linting passes, all Playwright tests in `e2e/` pass, and the stack is torn down

5. **Given** the `orval-freshness` job runs
   **When** it generates the OpenAPI spec from the FastAPI app and runs orval
   **Then** `git diff --exit-code frontend/src/api/generated` exits 0 (no uncommitted drift)

6. **Given** any CI job fails
   **Then** the workflow reports failure with clear output indicating the failing job and step

## Tasks / Subtasks

- [x] Task 1: Create GitHub Actions workflow (AC: 1, 2, 3, 4, 5, 6)
  - [x] Create `.github/workflows/` directory
  - [x] Create `.github/workflows/ci.yml` with all four jobs
  - [x] Configure triggers: `push` on `main` branch, `pull_request` on all branches
  - [x] `backend-checks` job: ruff check, ruff format --check, pytest
  - [x] `frontend-checks` job: biome check, vitest run
  - [x] `e2e-checks` job: biome check, docker compose (prod) up, wait for healthy, playwright test, docker compose down
  - [x] `orval-freshness` job: export openapi.json, run orval, git diff check

- [x] Task 2: Set up E2E Playwright infrastructure (AC: 4)
  - [x] Create `e2e/package.json` with `@playwright/test@1.58.2` dependency
  - [x] Create `e2e/playwright.config.ts` with baseURL `http://localhost`
  - [x] Create `e2e/tests/todos.spec.ts` with a baseline page-load smoke test
  - [x] Add `e2e/package-lock.json` (run `npm install` in `e2e/`)

- [x] Task 3: Verify all checks pass locally before pushing (AC: 2, 3)
  - [x] Run `cd backend && uv run ruff check .` → expect 0 errors
  - [x] Run `cd backend && uv run ruff format --check .` → expect 0 errors
  - [x] Run `cd backend && uv run pytest` → expect all tests pass
  - [x] Run `cd frontend && npx biome check .` → expect 0 errors
  - [x] Run `cd frontend && npx vitest run` → expect all tests pass

## Dev Notes

### Architecture & Context

This story creates the GitHub Actions CI pipeline on top of the scaffold from Story 1.1. No feature code is added — only the CI infrastructure and E2E test setup.

**What Story 1.1 established (do not recreate):**
- Full monorepo structure: `frontend/`, `backend/`, `proxy/`, `docker-compose.yml`, `docker-compose.override.yml`, `docker-compose.prod.yml`
- Biome 2.4.5 configured in `frontend/biome.json`
- Ruff 0.15.x configured in `backend/pyproject.toml`
- vitest 4.0.18 with `frontend/src/App.test.tsx` (basic smoke test)
- pytest with `backend/tests/test_main.py` (basic smoke test)
- `frontend/src/api/generated/` committed with `.gitkeep` (no routes exist yet)

### CI Workflow: `.github/workflows/ci.yml`

All four jobs run in parallel (no dependencies between them). Use `ubuntu-latest` for all runners.

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  backend-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install uv
        uses: astral-sh/setup-uv@v4
      - name: Install dependencies
        run: cd backend && uv sync --frozen
      - name: Ruff check
        run: cd backend && uv run ruff check .
      - name: Ruff format check
        run: cd backend && uv run ruff format --check .
      - name: Run pytest
        run: cd backend && uv run pytest

  frontend-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Biome check
        run: cd frontend && npx biome check .
      - name: Vitest run
        run: cd frontend && npx vitest run

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node (for Playwright)
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: e2e/package-lock.json
      - name: Install E2E dependencies
        run: cd e2e && npm ci
      - name: Install Playwright browsers
        run: cd e2e && npx playwright install --with-deps chromium
      - name: Create .env file
        run: |
          cp .env.example .env
          sed -i 's/^POSTGRES_DB=.*/POSTGRES_DB=todo/' .env
          sed -i 's/^POSTGRES_USER=.*/POSTGRES_USER=todo/' .env
          sed -i 's/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=todo/' .env
          sed -i 's/^CORS_ORIGINS=.*/CORS_ORIGINS=["http:\/\/localhost"]/' .env
      - name: Start Docker Compose stack
        run: docker compose up -d --wait
      - name: Run Playwright tests
        run: cd e2e && npx playwright test
      - name: Tear down stack
        if: always()
        run: docker compose down -v

  orval-freshness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install uv
        uses: astral-sh/setup-uv@v4
      - name: Install backend dependencies
        run: cd backend && uv sync --frozen
      - name: Generate OpenAPI spec
        run: cd backend && uv run python -c "import json; from app.main import app; print(json.dumps(app.openapi()))" > openapi.json
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json
      - name: Install frontend dependencies
        run: cd frontend && npm ci
      - name: Regenerate API client
        run: cd frontend && OPENAPI_PATH=../backend/openapi.json npx orval
      - name: Check for drift
        run: git diff --exit-code frontend/src/api/generated
```

**Key decisions:**
- `docker compose up -d --wait` blocks until all services are healthy — relies on the `healthcheck` already configured on `db` in `docker-compose.yml` from Story 1.1. The `--wait` flag waits for all containers with healthchecks to become healthy.
- Only `chromium` is installed for Playwright in CI (faster, sufficient for smoke testing). Full browser matrix is a post-MVP concern.
- `if: always()` on tear-down ensures cleanup even when tests fail.
- `.env` is created from `.env.example` with `sed` substitutions for CI credentials. The `.env.example` already has the right keys per Story 1.1.

### E2E Infrastructure

**`e2e/package.json`:**
```json
{
  "name": "e2e",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "1.58.2"
  }
}
```

**`e2e/playwright.config.ts`:**
```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost',
  },
  workers: 1,
})
```

**`e2e/tests/todos.spec.ts` — baseline smoke test for Story 1.2:**
```ts
import { test, expect } from '@playwright/test'

test('app loads without errors', async ({ page }) => {
  await page.goto('/')
  await expect(page).not.toHaveTitle('Error')
  await expect(page.locator('body')).toBeVisible()
})
```

**IMPORTANT:** This initial test is intentionally minimal — it only verifies the page loads. The full five user-journey tests (create, view, complete, delete, mobile) will be added in Story 2.x once the actual application functionality exists. **Do NOT write tests for features that don't exist yet.**

### `docker compose up -d --wait` — Healthcheck Dependency

The `db` service in `docker-compose.yml` already has a `healthcheck` configured (from Story 1.1). The `--wait` flag requires Docker Compose v2.1+, which is available on `ubuntu-latest` GitHub Actions runners. This waits for healthy status before returning.

If the `backend` service does not have a healthcheck, it may be necessary to add one to ensure the E2E test does not start before FastAPI is accepting connections:

```yaml
# In docker-compose.yml, add to backend service:
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/openapi.json"]
  interval: 5s
  retries: 10
  start_period: 30s
```

Add this to `docker-compose.yml` if `docker compose up -d --wait` does not reliably wait for the backend to be ready.

### orval-freshness: Backend Environment Variables

The `orval-freshness` job imports `from app.main import app`. This requires all environment variables defined in `backend/app/settings.py` to be present, or for settings to have defaults.

The current `settings.py` (from Story 1.1) requires `DATABASE_URL` and `CORS_ORIGINS` from env. The orval-freshness job does NOT start PostgreSQL, so `DATABASE_URL` will fail Pydantic validation unless defaults exist.

**Required fix:** Add a default for `DATABASE_URL` in `settings.py` to allow the openapi.json export to succeed without a real database:

```python
# backend/app/settings.py
class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://todo:todo@localhost:5432/todo"
    CORS_ORIGINS: list[str] = ["http://localhost"]
```

Alternatively, pass `DATABASE_URL` as an environment variable in the orval-freshness job step:
```yaml
- name: Generate OpenAPI spec
  run: cd backend && uv run python -c "import json; from app.main import app; print(json.dumps(app.openapi()))" > openapi.json
  env:
    DATABASE_URL: "postgresql+asyncpg://todo:todo@localhost:5432/todo"
    CORS_ORIGINS: '["http://localhost"]'
```

**Preferred approach:** Pass env vars in the step (does not modify production code behavior). Use this approach.

### Project Structure Notes

New files created by this story:
```
todo-bmad/
├── .github/
│   └── workflows/
│       └── ci.yml                    # All 4 CI jobs
├── e2e/
│   ├── tests/
│   │   └── todos.spec.ts             # Baseline smoke test (page loads)
│   ├── playwright.config.ts
│   ├── package.json                  # @playwright/test@1.58.2
│   └── package-lock.json
```

Files modified by this story:
- `docker-compose.yml` — add `healthcheck` to `backend` service (if needed for `--wait`)

Files NOT modified by this story (these already exist from Story 1.1):
- `frontend/biome.json`
- `backend/pyproject.toml` (ruff config)
- `frontend/vite.config.ts` (vitest config)
- `backend/tests/test_main.py`
- `frontend/src/App.test.tsx`

### Naming & Conventions (from Architecture)

- Python files: `snake_case`
- TypeScript non-component files: `camelCase` (`playwright.config.ts`, `todos.spec.ts`)
- DB naming, API endpoints: unchanged — no new endpoints or models in this story

### Previous Story Intelligence (Story 1.1)

From Story 1.1 completion notes and debug log:
- **Biome 2.4.5:** `organizeImports` is now under `assist.actions.source.organizeImports: "on"` — NOT a top-level key. The existing `biome.json` already has the correct config. Do NOT change it.
- **`npx orval` warning about prettier** is benign when no routes exist — the generated directory is empty (`.gitkeep` only). The `orval-freshness` job will pass because `git diff --exit-code` will find no changes when no routes change the spec.
- **Backend test:** `backend/tests/test_main.py` exists and passes. No `conftest.py` yet — that's added in Story 2.1.
- **Frontend test:** `frontend/src/App.test.tsx` exists and passes with vitest + jsdom.
- **Ruff import ordering:** `alembic/env.py` was fixed in Story 1.1 — verify `ruff check` still passes.
- **No uv.lock in backend dev deps:** `aiosqlite` and `psycopg2-binary` are dev dependencies already added in Story 1.1. CI uses `uv sync --frozen` which installs ALL dependencies including dev by default. Use `uv sync --frozen --all-groups` if needed, or rely on the default (uv syncs all groups unless `--no-dev` is passed).

### References

- Architecture: CI pipeline shape and 4-job breakdown [Source: _bmad-output/planning-artifacts/architecture.md#Linting, Formatting & CI]
- Architecture: orval-freshness job exact commands [Source: _bmad-output/planning-artifacts/architecture.md#Linting, Formatting & CI]
- Architecture: complete project directory structure [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- Architecture: Docker Compose configuration and healthchecks [Source: _bmad-output/planning-artifacts/architecture.md#Docker Compose Configuration]
- Epics: Story 1.2 acceptance criteria [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- Story 1.1: Dev notes and debug log [Source: _bmad-output/implementation-artifacts/1-1-monorepo-scaffold-local-development-stack.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `backend/app/settings.py` already has `DATABASE_URL` default — used env var injection in orval-freshness step per preferred approach

### Completion Notes List

- Created `.github/workflows/ci.yml` with all four jobs (backend-checks, frontend-checks, e2e-checks, orval-freshness)
- Created E2E infrastructure: `e2e/package.json`, `e2e/playwright.config.ts`, `e2e/tests/todos.spec.ts`, `e2e/package-lock.json`
- All local checks verified passing: ruff check, ruff format --check, pytest, biome check, vitest run
- orval-freshness job uses env var injection (DATABASE_URL, CORS_ORIGINS) per story preferred approach
- e2e-checks job uses production compose stack (`docker-compose.yml` + `docker-compose.prod.yml`) with Docker Bake caching
- Post-implementation manual changes by developer:
  - Restructured Docker setup: created `db/Dockerfile`, `proxy/Dockerfile`, switched docker-compose.yml from `image:` to `build: context:` for Docker Bake GHA cache support
  - Refined `docker-compose.override.yml`: updated bind mounts and simplified dev command to `["--reload"]` (passed to entrypoint.sh via `$@`)
  - Updated `backend/Dockerfile` and `backend/entrypoint.sh` to support both prod and dev via entrypoint pattern
  - Deleted `backend/main.py` (leftover `uv init` placeholder)
  - Added Biome linting to e2e tests (`e2e/biome.json`, CI step)
  - Bumped Biome from 2.4.5 to 2.4.6 across frontend and e2e
  - Restricted CI push trigger to `main` branch only (PRs still trigger on all branches)

### File List

- `.github/workflows/ci.yml` (new)
- `e2e/package.json` (new)
- `e2e/package-lock.json` (new)
- `e2e/playwright.config.ts` (new)
- `e2e/tests/todos.spec.ts` (new)
- `e2e/biome.json` (new — Biome linting for e2e tests)
- `db/Dockerfile` (new — wraps postgres:17-alpine for Docker Bake compatibility)
- `proxy/Dockerfile` (new — wraps caddy:2-alpine + Caddyfile for Docker Bake compatibility)
- `docker-compose.yml` (modified — switched all services from `image:` to `build: context:` for Bake caching)
- `docker-compose.override.yml` (modified — refined bind mounts, simplified command to `["--reload"]`)
- `backend/Dockerfile` (modified — added uv cache mount, ENV PATH, switched to entrypoint pattern)
- `backend/entrypoint.sh` (modified — accepts extra args via `"$@"` for dev reload support)
- `backend/main.py` (deleted — leftover `uv init` placeholder, not application code)
- `frontend/biome.json` (modified — updated to Biome 2.4.6 schema, fixed organizeImports config)
- `frontend/package.json` (modified — bumped @biomejs/biome to ^2.4.6)
- `frontend/package-lock.json` (modified — lockfile update for biome bump)

## Change Log

- 2026-03-05: Implemented Story 1.2 — created GitHub Actions CI workflow with 4 jobs, E2E Playwright infrastructure
- 2026-03-05: Post-implementation refinements — Docker restructuring (Bake-compatible Dockerfiles, build contexts), Biome 2.4.6 upgrade, e2e linting, CI trigger scoped to main, dev compose simplification
- 2026-03-06: Code review — updated story documentation to reflect all manual post-implementation changes
