# CLAUDE.md — Working Agreements

## Alembic Migrations

- The dev stack (Docker Compose) is always running locally. Use it to run Alembic commands — never create migration files manually.
- Generate migrations: `docker compose exec backend alembic revision --autogenerate -m "description"`
- Apply migrations: `docker compose exec backend alembic upgrade head`
- Always verify the generated migration file in `backend/alembic/versions/` looks correct before committing.

## Formatting & Linting

Always run formatter first, then linter with autofix. This avoids false positives (e.g. line-too-long) that the formatter would have fixed anyway.

**Backend** (run from `backend/`):
```bash
uv run ruff format .
uv run ruff check --fix .
uv run pyright app/
```

**Frontend / e2e** (run from the relevant directory):
```bash
npx biome check --write .
```
Biome runs formatting before linting internally, and `--write` autofixes everything fixable in one pass.

## Frontend API Client

Always set `operation_id` on every FastAPI endpoint. Without it, FastAPI auto-generates verbose names like `list_todos_todos_get` which Orval uses verbatim, resulting in unwieldy generated function names. Use camelCase matching the intended client function name (e.g. `operation_id="listTodos"`).

After any change to backend API endpoints (adding/removing endpoints, changing request/response shapes, adding operation_ids), always regenerate the frontend API client:

```bash
cd frontend && npm run generate-api
```

The generated files in `frontend/src/api/generated/` must be committed. The `orval-freshness` CI job will fail if they are stale.

Before regenerating, confirm uvicorn has finished reloading by checking `docker compose logs backend --tail=5` for a "Reloading..." / "Application startup complete" message. Regenerating before the reload completes will produce a stale client from the old spec.

## E2E Test Conventions

- Use `beforeEach` to delete all todos (or reset relevant state) so every test starts with a clean slate.
- Do **not** use `afterEach` for teardown. Leaving state intact on failure makes it possible to inspect what went wrong.

## Story Documentation

When modifying files that belong to an in-progress or review story (check `_bmad-output/implementation-artifacts/` for active stories), update the story file's **Dev Agent Record** section:
- **File List**: Add any new/modified files not already listed
- **Change Log**: Append a dated entry summarizing what changed and why

## Verification Habits

- After implementing a change, run **all three layers of tests** and confirm they pass before reporting done:
  - Backend: `docker compose exec backend pytest`
  - Frontend unit: `cd frontend && npx vitest run`
  - E2E: `cd e2e && npx playwright test`
- E2E tests are not optional — always write and run them for any user-facing feature, not just when explicitly asked. Cover major user flows only (happy path + persistence). Edge cases and error conditions belong in unit tests, not e2e.
- After editing any file, run the linter (Biome for frontend/e2e, Ruff for backend) and fix any issues before reporting done.
