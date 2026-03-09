# todo-bmad

Full-stack monorepo: FastAPI backend + React frontend + PostgreSQL + Caddy reverse proxy.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose
- [Node.js 22+](https://nodejs.org/) and npm (for local frontend development)
- [uv](https://github.com/astral-sh/uv) (for local backend development)

## Setup

1. Clone the repo
2. Copy the example env file and populate with values:
   ```bash
   cp .env.example .env
   ```
3. Start all services:
   ```bash
   docker compose up
   ```

## Dev Commands

| Command | Description |
|---|---|
| `docker compose up` | Start all services (dev mode with hot-reload) |
| `docker compose up --build` | Rebuild images and start |
| `docker compose down` | Stop all services |
| `cd frontend && npm run generate-api` | Regenerate TypeScript API client from OpenAPI spec |
| `cd frontend && npx biome check --write .` | Lint and format frontend |
| `cd backend && uv run ruff format . && uv run ruff check --fix .` | Format and lint backend |
| `cd backend && uv run pyright app/` | Type-check backend |

## Testing

| Command | Description |
|---|---|
| `cd backend && uv run pytest` | Run backend unit tests |
| `cd frontend && npx vitest run` | Run frontend unit tests |
| `cd e2e && npx playwright test` | Run E2E tests (requires Docker stack running) |
| `cd e2e && npx playwright test --project=chromium` | Run E2E tests in a single browser |

E2E tests run against the full Docker Compose stack on `http://localhost`. Playwright is configured for Chromium, Firefox, and WebKit (Safari). Test files live in `e2e/tests/`.

## Project Structure

```
todo-bmad/
├── backend/                      # FastAPI + SQLModel
│   ├── app/
│   │   ├── main.py               # FastAPI app entry point, CORS middleware
│   │   ├── models.py             # SQLModel split models (TodoBase/Create/Public/Table)
│   │   ├── database.py           # Async engine, session dependency
│   │   ├── settings.py           # Pydantic settings (DATABASE_URL, CORS_ORIGINS)
│   │   └── routes/
│   │       └── todos.py          # GET/POST/PATCH/DELETE /todos
│   ├── alembic/                  # Database migrations (committed, applied on startup)
│   ├── tests/                    # pytest tests with in-memory SQLite
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/                     # Vite + React + TypeScript + TanStack Query
│   ├── src/
│   │   ├── api/generated/        # Orval-generated API client (committed, never edit by hand)
│   │   ├── components/           # React components (TodoItem, TodoRow, AppHeader, etc.)
│   │   │   └── ui/               # shadcn/ui primitives (Button, Checkbox, Input, Skeleton)
│   │   ├── hooks/                # Custom hooks (useTheme)
│   │   ├── lib/                  # Utilities (optimisticMutation, cn helper)
│   │   ├── App.tsx               # Root component
│   │   └── main.tsx              # React entry point, QueryClientProvider, ErrorBoundary
│   ├── orval.config.ts           # API client codegen config
│   ├── biome.json                # Linting + formatting config
│   ├── Dockerfile
│   └── package.json
├── e2e/                          # Playwright end-to-end tests
│   ├── tests/                    # Test files (todos, loading, responsive, accessibility)
│   └── playwright.config.ts      # baseURL: http://localhost, chromium/firefox/webkit
├── proxy/                        # Caddy reverse proxy
│   ├── Caddyfile                 # Routes /api/* → backend:8000, /* → frontend:5173
│   └── Dockerfile
├── db/                           # PostgreSQL image build context
│   └── Dockerfile
├── .claude/                      # Claude Code project configuration
│   └── settings.json             # Pre-approved tool permissions
├── .mcp.json                     # Playwright MCP server (browser interaction for Claude Code)
├── .github/workflows/ci.yml      # CI: backend-checks, frontend-checks, e2e, orval-freshness
├── docker-compose.yml            # Base config
├── docker-compose.override.yml   # Dev overrides (bind mounts, hot-reload)
├── docker-compose.prod.yml       # Production overrides
└── .env.example                  # Required environment variables
```

## Service URLs (dev)

- Frontend: http://localhost
- API: http://localhost/api
- OpenAPI docs: http://localhost/api/docs
- Database: localhost:5432
