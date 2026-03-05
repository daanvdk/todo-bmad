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
| `cd frontend && npx orval` | Regenerate TypeScript API client from OpenAPI spec |
| `cd frontend && npx biome check .` | Lint and format check frontend |
| `cd backend && uv run ruff check .` | Lint backend |
| `cd frontend && npx vitest` | Run frontend unit tests |
| `cd backend && uv run pytest` | Run backend tests |

## Project Structure

```
todo-bmad/
├── backend/          # FastAPI + SQLModel + Alembic
│   ├── app/
│   │   ├── main.py       # FastAPI app entry point
│   │   └── settings.py   # Pydantic settings
│   ├── alembic/          # Database migrations
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/         # Vite + React + TypeScript + TanStack Query
│   ├── src/
│   │   └── api/generated/  # Orval-generated API client (committed)
│   ├── Dockerfile
│   └── package.json
├── proxy/            # Caddy reverse proxy
│   └── Caddyfile         # Routes /api/* → backend, /* → frontend
├── docker-compose.yml          # Base config
├── docker-compose.override.yml # Dev overrides (bind mounts, hot-reload)
├── docker-compose.prod.yml     # Production overrides
└── .env.example                # Required environment variables
```

## Service URLs (dev)

- Frontend: http://localhost
- API: http://localhost/api
- OpenAPI docs: http://localhost/api/docs
- Database: localhost:5432
