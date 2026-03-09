# Story 4.2: Backend Health Endpoint

Status: done

## Story

As a **developer**,
I want a health endpoint on the backend,
So that Docker and any external monitoring can check whether the service is up without touching business logic.

## Acceptance Criteria

1. **Given** the backend service is running **When** `GET /health` is called **Then** it returns `200 OK` with body `{"status": "ok"}`

2. **Given** the Caddy proxy is running **When** `GET /api/health` is called **Then** it proxies to the backend and returns the same `200 OK` response

3. **Given** the FastAPI app **Then** the `/health` route has `operation_id="healthCheck"` and is included in the OpenAPI spec

4. **Given** the backend test suite **Then** a pytest test covers `GET /health` asserting status `200` and response body `{"status": "ok"}`

## Tasks / Subtasks

- [x] Add `GET /health` endpoint to the FastAPI app (AC: #1, #3)
  - [x] Define the endpoint in `backend/app/main.py` (or a new `backend/app/routes/health.py` router — see Dev Notes)
  - [x] Return `{"status": "ok"}` with status `200`
  - [x] Set `operation_id="healthCheck"`
  - [x] No DB session dependency — pure static response
- [x] Write pytest test for the health endpoint (AC: #4)
  - [x] Add `test_health_check` to `backend/tests/test_main.py` (sync TestClient is fine — no async session needed)
  - [x] Assert status `200` and `response.json() == {"status": "ok"}`
- [x] Regenerate frontend API client (AC: #3 — orval-freshness CI gate)
  - [x] Confirm uvicorn has reloaded: `docker compose logs backend --tail=5`
  - [x] Run `cd frontend && npm run generate-api`
  - [x] Commit generated files in `frontend/src/api/generated/`
- [x] Run all three test layers and linter before reporting done

## Dev Notes

### Where to implement

Two options:

**Option A — Inline in `main.py` (recommended for a single endpoint):**
```python
from fastapi.responses import JSONResponse

@app.get("/health", operation_id="healthCheck")
async def health_check():
    return JSONResponse({"status": "ok"})
```
Add after the middleware/router registration. Simple, no new file.

**Option B — Separate router `backend/app/routes/health.py`:**
```python
from fastapi import APIRouter
router = APIRouter(tags=["health"])

@router.get("/health", operation_id="healthCheck")
async def health_check():
    return {"status": "ok"}
```
Then in `main.py`: `app.include_router(health_router)`

Both are valid. Option A is simpler for a single endpoint. Option B follows the existing router pattern if consistency is preferred.

### Caddy routing — no change needed

The proxy `Caddyfile` already routes all `/api/*` traffic to `backend:8000` using `handle_path`:
```
:80 {
    handle_path /api/* {
        reverse_proxy backend:8000
    }
    ...
}
```
`handle_path` strips the `/api` prefix before forwarding. So `GET /api/health` via the proxy becomes `GET /health` on the backend automatically. **No changes to `proxy/Caddyfile` are needed.**

### No DB session dependency

The health endpoint is a static response — it does not touch the database. Do NOT add `session: AsyncSession = Depends(get_session)` to this endpoint. This is intentional: a health check should succeed even if the DB is temporarily unavailable.

### Frontend API client regeneration

Adding a new endpoint with `operation_id="healthCheck"` changes the OpenAPI spec. The `orval-freshness` CI job (`git diff --exit-code frontend/src/api/generated`) will fail if the generated client is stale. Regenerate after implementing:

```bash
# 1. Confirm backend has reloaded
docker compose logs backend --tail=5
# Look for: "Application startup complete" or "Reloading..."

# 2. Regenerate
cd frontend && npm run generate-api
```

The generated `health.ts` (or similar) file in `frontend/src/api/generated/` must be committed. The frontend UI does not need to USE the health hook — it just needs to exist in the committed generated files.

### Test placement

The existing `backend/tests/test_main.py` uses a sync `TestClient` (not the async client from conftest.py) — this is appropriate for the health endpoint since it needs no DB session. Add the test there:

```python
def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

### Backend routes at a glance

Current `backend/app/routes/todos.py`:
- `GET    /todos`       — `operation_id="listTodos"`
- `POST   /todos`       — `operation_id="createTodo"`
- `PATCH  /todos/{id}`  — `operation_id="updateTodo"`
- `DELETE /todos/{id}`  — `operation_id="deleteTodo"`

New endpoint to add:
- `GET    /health`      — `operation_id="healthCheck"`

### Story 4.1 learnings (previous story)

Story 4.1 was purely Dockerfile changes with no application code. The dev override in `docker-compose.override.yml` sets `user: root` for backend and frontend at runtime (for bind-mount HMR). This has no impact on this story — health endpoint is application code only.

The backend now runs as `appuser` in the final image but as `root` in the dev override. Tests run via `cd backend && uv run pytest` (not via Docker) so this is irrelevant to the test run.

### Project Structure Notes

- **Files to create or modify:**
  - `backend/app/main.py` — add `GET /health` endpoint (if Option A)
  - OR `backend/app/routes/health.py` + update `backend/app/main.py` (if Option B)
  - `backend/tests/test_main.py` — add `test_health_check`
  - `frontend/src/api/generated/` — regenerate (committed, never hand-edited)

- **Files NOT to touch:**
  - `proxy/Caddyfile` — no change needed, routing works automatically
  - `docker-compose.yml` — Story 4.3 will add health checks; this story only adds the endpoint
  - Any frontend `.tsx` components — health endpoint is not used in the UI

- **No Alembic migration** — no DB schema changes

### References

- Story 4.2 acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md#Story-4.2]
- Epic 4 objective: [Source: _bmad-output/planning-artifacts/epics.md#Epic-4]
- Caddy routing pattern (`handle_path`): [Source: _bmad-output/planning-artifacts/architecture.md#Reverse-Proxy]
- `operation_id` convention: [Source: CLAUDE.md#Frontend-API-Client]
- Frontend API client regeneration: [Source: CLAUDE.md#Frontend-API-Client]
- Backend routes pattern: `backend/app/routes/todos.py`
- Test pattern (sync TestClient): `backend/tests/test_main.py`
- Test pattern (async client): `backend/tests/conftest.py`, `backend/tests/routes/test_todos.py`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Added `GET /health` endpoint inline to `backend/app/main.py` with `operation_id="healthCheck"`. Returns `{"status": "ok"}` with no DB dependency.
- Added `test_health_check` to `backend/tests/test_main.py` using existing sync `TestClient`. Test asserts `status == 200` and `body == {"status": "ok"}`.
- Caddy routing works automatically via `handle_path /api/*` — `GET /api/health` proxies to `GET /health` on backend, verified with `curl http://localhost/api/health`.
- Regenerated frontend API client: `todoBmadAPI.schemas.ts` updated with `HealthCheck200` type; `useHealthCheck` hook confirmed present in `default/default.ts`.
- All pre-existing tests pass: 13 backend, 61 frontend unit, 72 E2E. No new E2E test added (health endpoint is not user-facing UI). Backend linter (ruff + pyright): 0 errors.

### File List

- `backend/app/main.py`
- `backend/tests/test_main.py`
- `frontend/src/api/generated/todoBmadAPI.schemas.ts`
- `frontend/src/api/generated/default/default.ts`

### Change Log

- 2026-03-09: Implemented story 4.2 — added `GET /health` endpoint to FastAPI app, test, and regenerated frontend API client.
- 2026-03-09: Code review fixes — added Pydantic `HealthResponse` model for typed OpenAPI schema, fixed File List (added missing generated file), clarified completion notes re: E2E coverage.
