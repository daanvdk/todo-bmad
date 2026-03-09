from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.routes.todos import router as todos_router
from app.settings import settings

app = FastAPI(title="todo-bmad API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(todos_router)


class HealthResponse(BaseModel):
    status: Literal["ok"]


@app.get("/health", operation_id="healthCheck", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok")
