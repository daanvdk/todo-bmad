# Security Findings Report — todo-bmad

**Date:** 2026-03-10
**Story:** 5.4 — Security Review & Findings Report
**Auditor:** Claude Sonnet 4.6 (automated)
**Scope:** Backend Python dependencies, frontend Node dependencies, CORS configuration, API input validation, secrets hygiene, container privilege status

---

## Summary

| Area | Status | Finding |
|------|--------|---------|
| Backend dependencies | ✅ Pass | No known CVEs in 62 resolved packages |
| Frontend dependencies | ✅ Pass | No vulnerabilities found |
| E2E dependencies | ✅ Pass | No vulnerabilities found |
| CORS configuration | ✅ Pass | Origins explicitly allowlisted; no wildcard |
| Input validation | ✅ Pass | Robust validation; zero raw SQL |
| Secrets hygiene | ✅ Pass | No secrets committed; `.env` properly ignored |
| Container privileges | ✅ Pass | All containers run as non-root |

**Overall risk posture: LOW** — No unresolved high or critical issues found.

---

## 1. Dependency Audit Results

### 1.1 Backend Python Dependencies

**Tool:** `pip-audit 2.10.0` (installed via `uv add --dev pip-audit`, removed after audit)
**Command:** `cd backend && uv run pip-audit`
**Resolved packages:** 62 (production + dev)

**Result: No known vulnerabilities found.**

Key production dependencies audited (resolved versions from `uv.lock`):
| Package | Resolved Version | CVEs |
|---------|-----------------|------|
| alembic | 1.18.4 | None |
| asyncpg | 0.31.0 | None |
| fastapi[standard] | 0.135.1 | None |
| greenlet | 3.3.2 | None |
| psycopg2-binary | 2.9.11 | None |
| pydantic-settings | 2.13.1 | None |
| sqlmodel | 0.0.37 | None |

**No remediation required.**

### 1.2 Frontend Node Dependencies

**Tool:** `npm audit`
**Command:** `cd frontend && npm audit`

**Result: found 0 vulnerabilities**

Key production dependencies audited:
- `@radix-ui/react-checkbox`, `@radix-ui/react-slot`
- `@tanstack/react-query@^5.90.21`
- `react@^19.2.0`, `react-dom@^19.2.0`
- `@tailwindcss/vite@^4.2.1`, `tailwindcss@^4.2.1`
- `lucide-react@^0.577.0`

**No remediation required.**

### 1.3 E2E Test Dependencies

**Tool:** `npm audit`
**Command:** `cd e2e && npm audit`

**Result: found 0 vulnerabilities**

Dependencies audited: `@playwright/test`, `@axe-core/playwright` (all dev/test only, not deployed to production).

**No remediation required.**

---

## 2. CORS Configuration Review

**Files reviewed:** `backend/app/settings.py`, `backend/app/main.py`, `.env.example`

### Findings

**`backend/app/settings.py`:**
```python
class Settings(BaseSettings):
    CORS_ORIGINS: list[str] = ["http://localhost"]
    model_config = {"env_file": ".env"}
```
- Default value is an explicit allowlist (`["http://localhost"]`), not a wildcard. ✓

**`backend/app/main.py`:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # reads from env, not hardcoded
    allow_methods=["*"],
    allow_headers=["*"],
)
```
- `allow_origins` is bound to `settings.CORS_ORIGINS` — not hardcoded `"*"`. ✓
- `allow_methods=["*"]` and `allow_headers=["*"]` are wildcarded. This is acceptable because the origin allowlist is locked. Methods and headers wildcards have no security impact when origins are restricted.

**`.env.example`:**
```
CORS_ORIGINS=["http://localhost"]
```
- Contains an explicit origin, not a wildcard. ✓

**Production configuration:** `docker-compose.prod.yml` exists (sets restart policies and production build target) but does not override `CORS_ORIGINS`. The origin allowlist is inherited from the base `docker-compose.yml` which reads `${CORS_ORIGINS}` from the environment.

**Architecture note:** In both development and production, all traffic is routed through Caddy on port 80/443, making frontend and backend same-origin. CORS is therefore largely academic in normal operation — it only applies if the API is accessed from a different origin (e.g., tooling, external clients).

**Verdict: PASS** — CORS origins are explicitly allowlisted. AC #3 satisfied.

---

## 3. Input Validation Review

**Files reviewed:** `backend/app/models.py`, `backend/app/routes/todos.py`

### Findings

**`backend/app/models.py` — `TodoBase`:**
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

Validation coverage:
| Input | Mechanism | Response |
|-------|-----------|----------|
| Empty string `""` | `min_length=1` | `422 Unprocessable Entity` ✓ |
| Whitespace-only `"   "` | `strip_text` validator + `min_length=1` after strip | `422 Unprocessable Entity` ✓ |
| Text > 500 chars | `max_length=500` | `422 Unprocessable Entity` ✓ |
| Non-int `todo_id` in path | FastAPI path param `todo_id: int` type annotation | `422 Unprocessable Entity` ✓ |

**`backend/app/routes/todos.py` — ORM usage:**
All database queries use SQLModel ORM — no raw SQL anywhere:
- `session.exec(select(Todo).order_by(...))` — list query
- `session.add(db_todo)` + `session.commit()` — create
- `session.get(Todo, todo_id)` — fetch by id
- `session.delete(todo)` + `session.commit()` — delete

**Verdict: PASS** — All endpoints validate input robustly; no injection vectors identified. AC #4 satisfied.

---

## 4. Secrets Hygiene Check

**Commands run:**
```bash
git log --all --diff-filter=A --name-only --pretty=format: | grep -E '^\.env$'
git ls-files | grep -E '\.env$'
```

### Findings

| Check | Result |
|-------|--------|
| `.env` ever committed in git history | Not found ✓ |
| `.env` currently tracked by git | Not tracked ✓ |
| `.env` in `.gitignore` | Present (`.env` entry confirmed) ✓ |
| `.env.example` values are placeholders | All placeholders (see below) ✓ |

**`.env.example` value review:**
```
POSTGRES_DB=todo          # generic placeholder ✓
POSTGRES_USER=postgres    # well-known default username, clearly dev-only ✓
POSTGRES_PASSWORD=postgres # weak but obviously a dev placeholder ✓
CORS_ORIGINS=["http://localhost"] # non-sensitive, explicit origin ✓
```

The `postgres`/`postgres` credentials are weak but are clearly development defaults in `.env.example`. No real credentials are present. The file is explicitly named `.example` and is not used in production without override.

**Hardcoded default in source code:**
`backend/app/settings.py` contains a hardcoded fallback `DATABASE_URL` with dev credentials (`postgres:postgres`). This is a Pydantic `BaseSettings` default that is overridden by the `DATABASE_URL` environment variable in all environments (set via `docker-compose.yml`). If the env var were ever unset, the fallback would silently connect using weak credentials. Accepted risk: dev-only default, production deployments must set the env var.

**Verdict: PASS** — No secrets, credentials, or `.env` files with real values are committed. AC #5 satisfied.

---

## 5. Container Privilege Status

**Files reviewed:** `backend/Dockerfile`, `frontend/Dockerfile`
**Reference:** Story 4.1 (commit `a518bd4 4.1: non root images`)

### Findings

**Backend (`backend/Dockerfile`):**
```dockerfile
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown appuser:appuser /app
...
USER appuser
```
Runs as `appuser` (non-root, no login shell, system user). ✓

**Frontend development stage (`frontend/Dockerfile`):**
```dockerfile
FROM node:22-alpine AS development
...
USER node
```
Runs as `node` user built into `node:22-alpine` (UID 1000, non-root). ✓

**Frontend production stage (`frontend/Dockerfile`):**
```dockerfile
FROM caddy:2-alpine AS production
...
USER nobody
```
Runs as `nobody` (effectively non-root). ✓

**Caddy proxy:** The `caddy:2-alpine` base image runs as non-root by default; `USER nobody` reinforces this. ✓

**PostgreSQL:** `postgres:17-alpine` runs as `postgres` user (non-root) by default. ✓

**Development override note:** `docker-compose.override.yml` sets `user: root` for backend and frontend services in local development. This is required for bind-mount file permissions (hot reload) and does not affect production. The override file is only loaded during `docker compose up` (not `docker compose -f docker-compose.yml -f docker-compose.prod.yml up`).

**Verdict: PASS** — All containers confirmed running as non-root users in production configuration. Story 4.1 completion verified. AC #6 satisfied.

---

## 6. Accepted Risks

No unresolved high or critical risks were identified. The following items are documented as accepted risks:

**Accepted risks:**
- `allow_methods=["*"]` and `allow_headers=["*"]` in CORS middleware — acceptable given origins are locked; documented in Section 2.
- `POSTGRES_PASSWORD=postgres` in `.env.example` — weak but appropriate for a dev placeholder; not a real credential.
- Hardcoded `DATABASE_URL` fallback in `backend/app/settings.py` with dev credentials — overridden by env var in all environments; dev-only default. Documented in Section 4.
- `docker-compose.override.yml` runs backend and frontend as `root` in local development for bind-mount compatibility — does not affect production. Documented in Section 5.

**Informational observations (no action required):**
- `allow_credentials` is not explicitly set in CORS middleware, defaulting to `False` — this is the secure default.
- No HTTP security headers configured (HSTS, X-Content-Type-Options, X-Frame-Options, CSP). In production, Caddy handles TLS and can be configured to add these headers. Out of scope for this application-level review.

---

## Appendix: Audit Commands Used

```bash
# Backend Python audit
cd backend && uv add --dev pip-audit && uv run pip-audit
# (pip-audit removed from dev deps after audit)

# Frontend Node audit
cd frontend && npm audit

# E2E Node audit
cd e2e && npm audit

# Secrets git history check
git log --all --diff-filter=A --name-only --pretty=format: | grep -E '^\.env$'
git ls-files | grep -E '\.env$'
cat .gitignore | grep -E '\.env'
```
