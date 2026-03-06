# Story 2.1: Backend Todo API & Database

Status: done

## Story

As a **developer**,
I want the Todo database model, Alembic migration, and all four REST endpoints implemented with tests,
so that the frontend has a fully working, tested API to build against.

## Acceptance Criteria

1. **Given** the backend service starts
   **When** the entrypoint script runs
   **Then** `alembic upgrade head` applies successfully and the `todo` table exists in PostgreSQL with columns: `id` (int PK), `text` (varchar 500), `is_completed` (bool, default false), `created_at` (timestamp, server default now)

2. **Given** the API is running
   **When** `GET /todos` is called
   **Then** it returns `200` with a JSON array of all todos as `TodoPublic` objects (`id`, `text`, `is_completed`, `created_at`)

3. **Given** a valid request body `{"text": "Buy milk"}`
   **When** `POST /todos` is called
   **Then** it returns `201` with the created `TodoPublic` object
   **And** the todo is persisted in the database

4. **Given** a request body with empty text `{"text": ""}` or `{"text": "   "}`
   **When** `POST /todos` is called
   **Then** it returns `422 Unprocessable Entity`

5. **Given** a request body with text exceeding 500 characters
   **When** `POST /todos` is called
   **Then** it returns `422 Unprocessable Entity`

6. **Given** an existing todo with `id=1`
   **When** `PATCH /todos/1` is called with `{"is_completed": true}`
   **Then** it returns `200` with the updated `TodoPublic` object

7. **Given** an existing todo with `id=1`
   **When** `DELETE /todos/1` is called
   **Then** it returns `204` and the todo no longer exists in the database

8. **Given** a non-existent `id`
   **When** `PATCH /todos/{id}` or `DELETE /todos/{id}` is called
   **Then** it returns `404 Not Found`

9. **Given** the test suite runs
   **Then** all endpoints are covered by pytest tests using an in-memory SQLite async session override via FastAPI dependency injection
   **And** `aiosqlite` and `psycopg2-binary` are present as dev/test dependencies

## Tasks / Subtasks

- [x] Task 1: Create SQLModel data models (AC: 1, 2, 3, 6)
  - [x] Create `backend/app/models.py` with TodoBase, TodoCreate, TodoPublic, Todo(table=True)
  - [x] Verify field types: text (str, max_length=500), is_completed (bool, default False), created_at (datetime, server_default)

- [x] Task 2: Create async database module (AC: 1, 2, 3, 6, 7)
  - [x] Create `backend/app/database.py` with async engine, AsyncSession, get_session dependency

- [x] Task 3: Create Todo CRUD endpoints (AC: 2, 3, 4, 5, 6, 7, 8)
  - [x] Create `backend/app/routes/__init__.py`
  - [x] Create `backend/app/routes/todos.py` with all 4 endpoints
  - [x] Update `backend/app/main.py` to include todos router

- [x] Task 4: Configure Alembic for autogenerate and create migration (AC: 1)
  - [x] Update `backend/alembic/env.py`: replace `target_metadata = None` with `target_metadata = SQLModel.metadata`
  - [x] Run `docker compose exec backend alembic revision --autogenerate -m "create todo table"`
  - [x] Verify migration file in `backend/alembic/versions/` contains correct columns
  - [x] Commit migration file to repo

- [x] Task 5: Create entrypoint.sh and update Dockerfile (AC: 1)
  - [x] SKIPPED — entrypoint.sh was previously removed from this project. CI migration step in `.github/workflows/ci.yml` handles migrations.

- [x] Task 6: Create test fixtures and write endpoint tests (AC: 9)
  - [x] Add `asyncio_mode = "auto"` to `[tool.pytest.ini_options]` in `backend/pyproject.toml`
  - [x] Create `backend/tests/conftest.py` with async SQLite session override
  - [x] Create `backend/tests/routes/__init__.py`
  - [x] Create `backend/tests/routes/test_todos.py` with comprehensive tests for all ACs
  - [x] Verify existing `backend/tests/test_main.py` still passes

- [x] Task 7: Regenerate API client and verify CI (AC: all)
  - [x] Run `cd frontend && npm run generate-api` to regenerate Orval client
  - [x] Commit generated `frontend/src/api/generated/` files
  - [x] Run `cd backend && uv run ruff check . && uv run ruff format --check .`
  - [x] Run `cd backend && uv run pytest` — all tests pass

## Dev Notes

### Current Backend State — What Exists, What to Build

**Already exists — do NOT recreate:**
- `backend/app/main.py`: FastAPI app with CORS middleware — only add `app.include_router(todos_router)`
- `backend/app/settings.py`: Pydantic Settings with `DATABASE_URL` and `CORS_ORIGINS` defaults — leave as-is
- `backend/app/__init__.py`: empty — leave as-is
- `backend/alembic/env.py`: sync URL conversion (`DATABASE_URL.replace("asyncpg", "psycopg2")`) — only update `target_metadata`
- `backend/alembic.ini`: fully configured — no changes needed
- `backend/alembic/versions/`: empty directory — add migration here
- `backend/tests/test_main.py`: basic openapi spec smoke test — must keep passing
- `backend/pyproject.toml`: ALL required dependencies already present (see below)

**All required dependencies already in `pyproject.toml` — do NOT add duplicates:**
```
# Production deps (already present):
fastapi[standard], sqlmodel, asyncpg, alembic, pydantic-settings, psycopg2-binary

# Dev deps (already present in [dependency-groups].dev):
pytest, pytest-asyncio, httpx, aiosqlite, ruff
```

### SQLModel Split Pattern (EXACT implementation required)

```python
# backend/app/models.py
from datetime import datetime
from sqlmodel import Field, SQLModel


class TodoBase(SQLModel):
    text: str = Field(min_length=1, max_length=500)
    is_completed: bool = Field(default=False)


class TodoCreate(TodoBase):
    pass


class TodoPublic(TodoBase):
    id: int
    created_at: datetime


class Todo(TodoBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(
        default=None,
        sa_column_kwargs={"server_default": "now()"},
    )
```

**Critical notes:**
- `min_length=1` on `text` handles empty string validation — FastAPI returns 422 automatically
- Whitespace-only text (`"   "`) also triggers 422 because SQLModel validates against min_length after stripping? No — SQLModel does NOT strip whitespace. Use a Pydantic validator to strip and then rely on min_length, OR add a `field_validator`:

```python
from pydantic import field_validator

class TodoBase(SQLModel):
    text: str = Field(min_length=1, max_length=500)
    is_completed: bool = Field(default=False)

    @field_validator("text")
    @classmethod
    def strip_text(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("text must not be blank")
        return stripped
```

This ensures `{"text": "   "}` returns 422. The validator strips and then the empty string check triggers the error.

### Async Database Module

```python
# backend/app/database.py
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.settings import settings

engine: AsyncEngine = create_async_engine(settings.DATABASE_URL)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine) as session:
        yield session
```

**Import note:** Use `sqlmodel.ext.asyncio.session.AsyncSession` (not SQLAlchemy's directly) for SQLModel compatibility.

### Todo Endpoints — Exact Spec

```python
# backend/app/routes/todos.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models import Todo, TodoCreate, TodoPublic

router = APIRouter(prefix="/todos", tags=["todos"])


@router.get("", response_model=list[TodoPublic])
async def list_todos(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Todo))
    return result.all()


@router.post("", response_model=TodoPublic, status_code=201)
async def create_todo(todo: TodoCreate, session: AsyncSession = Depends(get_session)):
    db_todo = Todo.model_validate(todo)
    session.add(db_todo)
    await session.commit()
    await session.refresh(db_todo)
    return db_todo


@router.patch("/{todo_id}", response_model=TodoPublic)
async def update_todo(todo_id: int, is_completed: bool, session: AsyncSession = Depends(get_session)):
    todo = await session.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    todo.is_completed = is_completed
    session.add(todo)
    await session.commit()
    await session.refresh(todo)
    return todo


@router.delete("/{todo_id}", status_code=204)
async def delete_todo(todo_id: int, session: AsyncSession = Depends(get_session)):
    todo = await session.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    await session.delete(todo)
    await session.commit()
```

**PATCH endpoint**: The epics AC says `PATCH /todos/1` with `{"is_completed": true}`. Use a request body model, not a query param:

```python
class TodoUpdate(SQLModel):
    is_completed: bool

@router.patch("/{todo_id}", response_model=TodoPublic)
async def update_todo(
    todo_id: int,
    update: TodoUpdate,
    session: AsyncSession = Depends(get_session),
):
    ...
    todo.is_completed = update.is_completed
```

Add `TodoUpdate` to `models.py`.

**Update `backend/app/main.py`** — add these lines (do NOT remove existing CORS middleware):

```python
from app.routes.todos import router as todos_router
# ...existing code...
app.include_router(todos_router)
```

### Alembic Migration

**Step 1: Update `alembic/env.py`**

Change `target_metadata = None` to:
```python
from app.models import Todo  # noqa: F401 — import needed for SQLModel.metadata to include Todo table
from sqlmodel import SQLModel

target_metadata = SQLModel.metadata
```

The `noqa: F401` comment is needed because Ruff's `F` rules flag unused imports, but the import IS needed to register the model with SQLModel.metadata before Alembic reads it.

**Step 2: Generate migration (requires running PostgreSQL)**

```bash
cd backend
# Requires the full stack running: docker compose up db -d
uv run alembic revision --autogenerate -m "create todo table"
```

If you cannot run PostgreSQL locally, create the migration manually:

```python
# alembic/versions/XXXX_create_todo_table.py
def upgrade() -> None:
    op.create_table(
        "todo",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("text", sa.String(length=500), nullable=False),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )

def downgrade() -> None:
    op.drop_table("todo")
```

**Table name:** SQLModel uses singular lowercase by default — the table will be named `todo`.

### Entrypoint Script

Create `backend/entrypoint.sh`:
```bash
#!/bin/bash
set -e
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 "$@"
```

Update `backend/Dockerfile` — change the last line from:
```dockerfile
ENTRYPOINT ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
to:
```dockerfile
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
```

**The `"$@"` in entrypoint.sh is critical** — it passes the `command: ["--reload"]` from `docker-compose.override.yml` through to uvicorn for dev hot-reload.

**CI impact:** The `e2e-checks` job in `.github/workflows/ci.yml` currently runs an explicit migration step:
```yaml
- name: Run database migrations
  run: docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend alembic upgrade head
```
With entrypoint.sh running migrations at startup, this step becomes a harmless no-op (idempotent). Do NOT remove it — it ensures CI passes if entrypoint.sh approach is ever changed.

### Test Fixtures and Async Test Configuration

**Add to `[tool.pytest.ini_options]` in `backend/pyproject.toml`:**
```toml
[tool.pytest.ini_options]
pythonpath = ["."]
asyncio_mode = "auto"
```

`asyncio_mode = "auto"` is required for pytest-asyncio 0.21+ (installed version is 1.x). Without it, async test functions are not recognized.

**`backend/tests/conftest.py`:**
```python
from collections.abc import AsyncGenerator
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.main import app


@pytest.fixture
async def session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    async with AsyncSession(engine) as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    app.dependency_overrides[get_session] = lambda: session
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()
```

**Critical:** Use `httpx.AsyncClient` with `ASGITransport` — NOT `fastapi.testclient.TestClient`. The existing `tests/test_main.py` uses `TestClient` (sync) — that still works fine. New async tests use `AsyncClient`.

**`backend/tests/routes/test_todos.py`** — must cover ALL acceptance criteria:

```python
import pytest
from httpx import AsyncClient


async def test_list_todos_empty(client: AsyncClient):
    response = await client.get("/todos")
    assert response.status_code == 200
    assert response.json() == []


async def test_create_todo(client: AsyncClient):
    response = await client.post("/todos", json={"text": "Buy milk"})
    assert response.status_code == 201
    data = response.json()
    assert data["text"] == "Buy milk"
    assert data["is_completed"] is False
    assert "id" in data
    assert "created_at" in data


async def test_create_todo_empty_text(client: AsyncClient):
    response = await client.post("/todos", json={"text": ""})
    assert response.status_code == 422


async def test_create_todo_whitespace_only(client: AsyncClient):
    response = await client.post("/todos", json={"text": "   "})
    assert response.status_code == 422


async def test_create_todo_text_too_long(client: AsyncClient):
    response = await client.post("/todos", json={"text": "x" * 501})
    assert response.status_code == 422


async def test_update_todo(client: AsyncClient):
    create = await client.post("/todos", json={"text": "Task"})
    todo_id = create.json()["id"]
    response = await client.patch(f"/todos/{todo_id}", json={"is_completed": True})
    assert response.status_code == 200
    assert response.json()["is_completed"] is True


async def test_update_todo_not_found(client: AsyncClient):
    response = await client.patch("/todos/9999", json={"is_completed": True})
    assert response.status_code == 404


async def test_delete_todo(client: AsyncClient):
    create = await client.post("/todos", json={"text": "Task"})
    todo_id = create.json()["id"]
    response = await client.delete(f"/todos/{todo_id}")
    assert response.status_code == 204
    list_response = await client.get("/todos")
    assert list_response.json() == []


async def test_delete_todo_not_found(client: AsyncClient):
    response = await client.delete("/todos/9999")
    assert response.status_code == 404
```

### Orval Regeneration — Required After This Story

After all backend code is complete and tests pass, regenerate the frontend API client:

```bash
# Requires the full stack running (docker compose up)
cd frontend && npm run generate-api
```

The `generate-api` script runs `orval` (reads from `http://localhost/api/openapi.json`) then `biome format --write` on the generated files. Commit the generated files in `frontend/src/api/generated/`.

**If stack is not running**, use file-based generation:
```bash
cd backend && uv run python -c "import json; from app.main import app; print(json.dumps(app.openapi()))" > openapi.json
cd frontend && OPENAPI_PATH=../backend/openapi.json npm run generate-api
```

Generated files must be committed — `orval-freshness` CI job will fail if they're missing or stale.

### Project Structure — New Files for This Story

```
backend/
├── app/
│   ├── models.py          # NEW: TodoBase, TodoCreate, TodoPublic, TodoUpdate, Todo
│   ├── database.py        # NEW: async engine + get_session dependency
│   └── routes/
│       ├── __init__.py    # NEW: empty
│       └── todos.py       # NEW: GET/POST/PATCH/DELETE /todos
├── alembic/
│   └── versions/
│       └── XXXX_create_todo_table.py  # NEW: migration
├── tests/
│   ├── conftest.py        # NEW: async SQLite session + AsyncClient fixture
│   └── routes/
│       ├── __init__.py    # NEW: empty
│       └── test_todos.py  # NEW: comprehensive endpoint tests
├── entrypoint.sh          # NEW: alembic upgrade head + uvicorn
├── app/main.py            # MODIFIED: add include_router
├── alembic/env.py         # MODIFIED: target_metadata = SQLModel.metadata
├── Dockerfile             # MODIFIED: use entrypoint.sh
└── pyproject.toml         # MODIFIED: add asyncio_mode = "auto"
```

**Files NOT modified (do not touch):**
- `app/settings.py` — already correct
- `app/__init__.py` — leave empty
- `alembic.ini` — already configured
- `tests/test_main.py` — must keep passing (sync TestClient test)

### Naming & Conventions (from Architecture)

- Python files: `snake_case` (`todo.py`, `database.py`)
- DB table name: singular lowercase (`todo`) — SQLModel default
- DB columns: `snake_case` (`is_completed`, `created_at`)
- API endpoints: plural nouns (`/todos`, `/todos/{id}`)
- JSON fields: `snake_case` throughout — FastAPI default
- HTTP status codes: `200` GET/PATCH, `201` POST, `204` DELETE, `404`, `422`

### Previous Story Learnings (from Stories 1.1 and 1.2)

- **Ruff import ordering**: `I` rule is active — imports must be sorted (stdlib, third-party, local). Run `ruff check . --fix` to auto-sort.
- **Ruff F401 (unused imports)**: The `from app.models import Todo` in `alembic/env.py` needs `# noqa: F401` since it's imported for side effects (registering with SQLModel.metadata).
- **Biome 2.4.6**: Frontend linting — applies after `orval` runs via `generate-api` script. No action needed here, just don't skip the regeneration step.
- **`uv sync --frozen`** in CI installs ALL dependency groups including dev. `aiosqlite` and other dev deps are available in the test runner.
- **Verify, don't just change**: After implementing each task, run the relevant test/lint command and confirm it passes. Do NOT move on until confirmed.
- **`conftest.py` is new** — no existing conftest to conflict with.

### References

- Architecture: SQLModel split model pattern [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- Architecture: Async database session pattern [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- Architecture: Alembic env.py sync URL conversion [Source: _bmad-output/planning-artifacts/architecture.md#Gap Analysis]
- Architecture: Testing strategy (pytest-asyncio, httpx, aiosqlite) [Source: _bmad-output/planning-artifacts/architecture.md#Testing]
- Architecture: Naming conventions [Source: _bmad-output/planning-artifacts/architecture.md#Naming Conventions]
- Architecture: Complete directory structure [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- Epics: Story 2.1 acceptance criteria [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1]
- Story 1.2: Ruff fix for alembic/env.py, uv sync behavior [Source: _bmad-output/implementation-artifacts/1-2-ci-pipeline.md#Previous Story Intelligence]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implemented SQLModel split model pattern: `TodoBase`, `TodoCreate`, `TodoUpdate`, `TodoPublic`, `Todo(table=True)` with `field_validator` for whitespace stripping on `text`.
- Used `sa_column=Column(DateTime, server_default=sa.func.now())` for `created_at` — renders correctly in both PostgreSQL (production) and SQLite (tests). `"now()"` string literal caused test failures with SQLite.
- Added `greenlet` as a production dependency (required by SQLAlchemy async engine, not just tests).
- Generated Alembic migration via `docker compose exec backend alembic revision --autogenerate` (dev stack running locally). Migration verified applying cleanly.
- Task 5 (entrypoint.sh) skipped — entrypoint.sh was previously removed from this project.
- All 10 tests pass (9 endpoint tests + 1 existing smoke test). Linting clean.
- Frontend Orval API client regenerated and committed.

**Code Review Fixes (2026-03-06):**
- Fixed `database.py`: replaced deprecated `typing.AsyncGenerator` with `collections.abc.AsyncGenerator`
- Fixed `routes/todos.py`: added `order_by(Todo.created_at)` to list query for deterministic ordering
- Added `test_list_todos_after_create`: verifies listing returns all created todos with correct TodoPublic shape
- Added `test_update_todo_toggle_back`: verifies bidirectional PATCH (true→false)
- Updated File List: added missing `frontend/biome.json`, `frontend/package.json`, `backend/uv.lock`

### File List

- `backend/app/models.py` (new)
- `backend/app/database.py` (new)
- `backend/app/routes/__init__.py` (new)
- `backend/app/routes/todos.py` (new)
- `backend/app/main.py` (modified — added todos router)
- `backend/alembic/env.py` (modified — target_metadata = SQLModel.metadata)
- `backend/alembic/versions/36e2fede41c6_create_todo_table.py` (new)
- `backend/tests/conftest.py` (new)
- `backend/tests/routes/__init__.py` (new)
- `backend/tests/routes/test_todos.py` (new)
- `backend/pyproject.toml` (modified — asyncio_mode, greenlet dep)
- `frontend/src/api/generated/` (regenerated)
- `frontend/biome.json` (modified — added generated/ exclude)
- `frontend/package.json` (modified — added @tanstack/react-query)
- `backend/uv.lock` (modified — lockfile updated for greenlet)
