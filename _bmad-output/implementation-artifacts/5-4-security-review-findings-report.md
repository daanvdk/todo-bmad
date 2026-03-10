# Story 5.4: Security Review & Findings Report

Status: done

## Story

As a **developer**,
I want a systematic security review with a documented findings report,
so that known vulnerabilities, misconfigurations, and hygiene issues are identified and addressed.

## Acceptance Criteria

1. **Given** the backend Python dependencies
   **When** `uv audit` (or `pip-audit`) runs
   **Then** all known CVEs are identified
   **And** any high or critical severity vulnerabilities are resolved or have a documented acceptance rationale

2. **Given** the frontend Node dependencies
   **When** `npm audit` runs
   **Then** all known CVEs are identified
   **And** any high or critical severity vulnerabilities are resolved or have a documented acceptance rationale

3. **Given** the CORS configuration
   **When** reviewed
   **Then** allowed origins are explicitly allowlisted — no wildcard `*` — in the production configuration
   **And** the review outcome is documented in the findings report

4. **Given** the API input validation
   **When** reviewed
   **Then** all endpoints reject empty text, oversized text (>500 chars), and malformed payloads with appropriate error codes
   **And** no raw SQL is used — all DB access goes through SQLModel/SQLAlchemy ORM

5. **Given** the repository contents
   **When** reviewed
   **Then** no secrets, credentials, or `.env` files with real values are committed
   **And** `.env.example` contains only placeholder values

6. **Given** container privilege review
   **Then** the findings confirm Story 4.1 is complete (all containers non-root) and this is noted in the report

7. **Given** the completed review
   **Then** a findings report is saved to `_bmad-output/planning-artifacts/security-findings-report.md`
   **And** it documents: dependency audit results, CORS review, input validation review, secrets hygiene check, container privilege status, and any outstanding accepted risks

## Tasks / Subtasks

- [x] Run Python dependency audit (AC: #1)
  - [x] `cd backend && uv run pip-audit` (try `uv audit` first; fall back to `pip-audit` if not available)
  - [x] Document findings: package name, CVE ID, severity, fix version or acceptance rationale
  - [x] Resolve any high/critical CVEs by updating the package in `pyproject.toml` and re-locking
- [x] Run Node dependency audit (AC: #2)
  - [x] `cd frontend && npm audit` — document findings
  - [x] `cd e2e && npm audit` — document findings
  - [x] Resolve any high/critical CVEs with `npm audit fix` where safe, or document acceptance rationale
- [x] Review CORS configuration (AC: #3)
  - [x] Check `backend/app/settings.py` — confirm `CORS_ORIGINS` default is an explicit allowlist
  - [x] Check `backend/app/main.py` — confirm `CORSMiddleware` passes `allow_origins=settings.CORS_ORIGINS`
  - [x] Check `.env.example` — confirm `CORS_ORIGINS` contains real origin, not `*`
  - [x] Verify `docker-compose.prod.yml` does not override CORS_ORIGINS with a wildcard
  - [x] Document outcome in findings report
- [x] Review input validation (AC: #4)
  - [x] Check `backend/app/models.py` — confirm `text` has `min_length=1`, `max_length=500`, whitespace validator
  - [x] Check `backend/app/routes/todos.py` — confirm no raw SQL; all queries via SQLModel `session.exec(select(...))`
  - [x] Confirm `PATCH /todos/{id}` validates `todo_id` is a valid int (FastAPI path param type annotation handles this)
  - [x] Document outcome in findings report
- [x] Secrets hygiene review (AC: #5)
  - [x] `git log --all --full-history -- .env` — confirm no `.env` has ever been committed
  - [x] `git ls-files | grep -E '\.env$'` — confirm not tracked
  - [x] Review `.env.example` — confirm all values are obvious placeholders (postgres/postgres is acceptable as it's clearly a dev default)
  - [x] Review `.gitignore` — confirm `.env` is ignored
  - [x] Document outcome in findings report
- [x] Confirm container privilege status (AC: #6)
  - [x] Check `backend/Dockerfile` for `USER appuser` instruction
  - [x] Check `frontend/Dockerfile` for `USER node` (dev) / `USER nobody` (prod) instructions
  - [x] Note Caddy official image runs non-root by default
  - [x] Document confirmation in findings report
- [x] Write findings report (AC: #7)
  - [x] Save to `_bmad-output/planning-artifacts/security-findings-report.md`
  - [x] Cover all six sections: dependency audits, CORS, input validation, secrets hygiene, container privileges, accepted risks
- [x] Run linter (no new code files, but if any fixes were made to Python/TS): run relevant linter
- [x] Update sprint-status.yaml: `5-4-security-review-findings-report: done` after completion

## Dev Notes

### Nature of This Story

This is a **security audit + documentation story** — no new feature code. The primary output is `_bmad-output/planning-artifacts/security-findings-report.md`. The dev runs tools, reviews code, and documents findings. Some remediation (dependency upgrades) may be needed if CVEs are found.

### Dependency Audit: Backend

Try `uv audit` first (added in uv 0.5.x+). If unavailable, install and use `pip-audit`:

```bash
# Option 1: uv built-in (preferred)
cd backend && uv run uv audit

# Option 2: pip-audit via uv
cd backend && uv run pip-audit
```

**Current backend dependencies to audit** (from `backend/pyproject.toml`):
- `alembic>=1.18.4`
- `asyncpg>=0.31.0`
- `fastapi[standard]>=0.135.1`
- `greenlet>=3.3.2`
- `psycopg2-binary>=2.9.11`
- `pydantic-settings>=2.13.1`
- `sqlmodel>=0.0.37`

Dev deps (audited but lower risk — not in prod container):
- `aiosqlite`, `httpx`, `pyright`, `pytest`, `pytest-asyncio`, `pytest-cov`, `ruff`

### Dependency Audit: Frontend

```bash
cd frontend && npm audit --audit-level=moderate
cd e2e && npm audit --audit-level=moderate
```

**Current frontend production dependencies** (from `frontend/package.json`):
- `@radix-ui/react-checkbox@^1.3.3`, `@radix-ui/react-slot@^1.2.4`
- `@tanstack/react-query@^5.90.21`
- `@tailwindcss/vite@^4.2.1`, `tailwindcss@^4.2.1`
- `class-variance-authority@^0.7.1`, `clsx@^2.1.1`, `tailwind-merge@^3.5.0`
- `lucide-react@^0.577.0`
- `react@^19.2.0`, `react-dom@^19.2.0`

Dev deps (lower risk): `@biomejs/biome`, `@testing-library/*`, `vitest`, `orval`, `vite`, `typescript`

**E2E deps** (from `e2e/package.json`) — all dev/test, not in prod:
- `@playwright/test`, `@axe-core/playwright`

### CORS Configuration Review

Current state (already verified):

**`backend/app/settings.py`:**
```python
class Settings(BaseSettings):
    CORS_ORIGINS: list[str] = ["http://localhost"]
    model_config = {"env_file": ".env"}
```

**`backend/app/main.py`:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # NOT "*" — reads from env
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Key findings to document:**
- `allow_origins` is NOT wildcarded — it uses `settings.CORS_ORIGINS` which defaults to `["http://localhost"]`
- `allow_methods=["*"]` and `allow_headers=["*"]` are wildcarded — this is acceptable because origins are locked
- In practice, all traffic routes through Caddy on port 80 (same origin) so CORS is largely academic in both dev and prod
- `.env.example` sets `CORS_ORIGINS=["http://localhost"]` — an explicit allowlist, not a wildcard
- `docker-compose.prod.yml` exists but does not override `CORS_ORIGINS`; origin allowlist inherited from base compose file

**Verdict:** CORS configuration meets the AC requirement — origins are explicitly allowlisted.

### Input Validation Review

Current state (already verified in `backend/app/models.py`):

```python
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

**Key findings to document:**
- Empty text (`""`) → `min_length=1` validation fails → FastAPI returns `422 Unprocessable Entity` ✓
- Whitespace-only text (`"   "`) → `strip_text` validator raises ValueError → `422` ✓
- Text > 500 chars → `max_length=500` → `422` ✓
- All DB queries via SQLModel `session.exec(select(...))` and `session.get(Model, id)` — zero raw SQL ✓
- `PATCH /todos/{todo_id}` — `todo_id: int` path param; FastAPI validates type automatically → `422` for non-int IDs

**Verdict:** Input validation is robust. No injection vectors identified.

### Secrets Hygiene Review

**Pre-verified state:**
- `.gitignore` should cover `.env` — verify with `git ls-files | grep '\.env$'`
- `.env.example` values:
  - `POSTGRES_DB=todo` — placeholder ✓
  - `POSTGRES_USER=postgres` — placeholder ✓
  - `POSTGRES_PASSWORD=postgres` — weak default but clearly a dev placeholder; acceptable for `.env.example` ✓
  - `CORS_ORIGINS=["http://localhost"]` — non-sensitive default ✓

**Key check:** Verify no `.env` file with real credentials has ever been committed:
```bash
git log --all --diff-filter=A --name-only --pretty=format: | grep -E '^\.env$'
```

### Container Privilege Review

**Pre-verified state from Story 4.1 (commit `a518bd4`):**

**`backend/Dockerfile`:**
```dockerfile
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown appuser:appuser /app
USER appuser
```
✓ Runs as `appuser` (non-root)

**`frontend/Dockerfile`:**
```dockerfile
# development stage
USER node          # node:22-alpine has node user built-in
# production stage
USER nobody        # caddy:2-alpine, user nobody
```
✓ Both stages run as non-root

**Caddy proxy:** Official `caddy:2-alpine` image runs as non-root by default ✓
**PostgreSQL db:** `postgres:17-alpine` — runs as `postgres` user (non-root) by default ✓

### Output Artifact

The primary output of this story is the findings report:

**Path:** `_bmad-output/planning-artifacts/security-findings-report.md`

**Required sections:**
1. Dependency Audit Results (backend CVEs, frontend CVEs, severity, resolution)
2. CORS Configuration Review (verdict, evidence)
3. Input Validation Review (verdict, evidence)
4. Secrets Hygiene Check (verdict, evidence)
5. Container Privilege Status (verdict, evidence from Story 4.1)
6. Accepted Risks (any unfixable or accepted findings with rationale)

### Git Intelligence

Recent commits show the security foundations were already laid:
- `a518bd4 4.1: non root images` — containers running as non-root ✓
- `4.2: backend health endpoint` — `/health` endpoint for monitoring ✓
- `4.3: health checks` — service health dependencies ✓
- `5.1 & 5.2: coverage analysis & performance validation` — testing maturity ✓

### Backend Linting (if any files modified)

```bash
cd backend && uv run ruff format . && uv run ruff check --fix . && uv run pyright app/
```

### Project Structure Notes

- **New file**: `_bmad-output/planning-artifacts/security-findings-report.md` (primary output)
- **Possibly modified**: `backend/pyproject.toml`, `uv.lock` (if CVEs resolved by upgrades)
- **Possibly modified**: `frontend/package.json`, `frontend/package-lock.json`, `e2e/package.json`, `e2e/package-lock.json` (if npm audit fix applied)
- **No new test files** required — this is a review/documentation story
- **No frontend component changes** expected

### References

- Story 5.4 ACs: [Source: _bmad-output/planning-artifacts/epics.md#Story-5.4]
- Current backend deps: [Source: backend/pyproject.toml]
- Current frontend deps: [Source: frontend/package.json]
- CORS setup: [Source: backend/app/settings.py, backend/app/main.py]
- Input validation: [Source: backend/app/models.py]
- Container privilege (Story 4.1 outcome): [Source: backend/Dockerfile, frontend/Dockerfile]
- Architecture — Auth & Security section: [Source: _bmad-output/planning-artifacts/architecture.md#Authentication-&-Security]
- Architecture — API patterns: [Source: _bmad-output/planning-artifacts/architecture.md#API-&-Communication]
- Caddy same-origin routing: [Source: _bmad-output/planning-artifacts/architecture.md#Reverse-Proxy-(Caddy)]
- Linting: [Source: CLAUDE.md#Formatting-&-Linting]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `uv audit` available but currently in preview/experimental mode — returned "Would have audited 62 dependencies" without actual CVE results. Fell back to `pip-audit` (installed via `uv add --dev pip-audit`, removed after audit).
- `pip-audit --requirement` mode fails on Python 3.13 with SIGABRT in `ensurepip`; ran successfully without the `-r` flag from within the backend project venv.

### Completion Notes List

- Ran `pip-audit 2.10.0` against 62 resolved backend packages — **no CVEs found**.
- Ran `npm audit` for frontend (0 vulnerabilities) and e2e (0 vulnerabilities).
- CORS: `allow_origins=settings.CORS_ORIGINS` confirmed — explicit allowlist `["http://localhost"]`, no wildcard. `docker-compose.prod.yml` exists but does not override CORS_ORIGINS.
- Input validation: `min_length=1`, `max_length=500`, whitespace-strip validator all present in `TodoBase`. All DB access via SQLModel ORM — zero raw SQL.
- Secrets: no `.env` ever committed in git history; `.env` not currently tracked; `.gitignore` covers it; `.env.example` contains only dev placeholders.
- Container privileges: backend `USER appuser`, frontend dev `USER node`, frontend prod `USER nobody`, PostgreSQL `postgres` user — all non-root. Story 4.1 outcome confirmed.
- Primary output: `_bmad-output/planning-artifacts/security-findings-report.md` created.
- No code files modified — audit-only story. No linting required.

### File List

- `_bmad-output/planning-artifacts/security-findings-report.md` (new)
- `_bmad-output/implementation-artifacts/5-4-security-review-findings-report.md` (updated)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated)

## Change Log

- 2026-03-10: Story 5.4 implemented — security audit completed across all six areas. No vulnerabilities found. Findings report written to `_bmad-output/planning-artifacts/security-findings-report.md`.
- 2026-03-10: Code review fixes — corrected false claim about docker-compose.prod.yml not existing (H2), unchecked premature sprint-status task (H1), added docker-compose.override.yml root-user documentation (M1), added DATABASE_URL hardcoded default to secrets hygiene section (M2), replaced version constraints with actual resolved versions from uv.lock (M3). Updated Accepted Risks section with newly documented items.
