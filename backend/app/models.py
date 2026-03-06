from datetime import datetime

import sqlalchemy as sa
from pydantic import field_validator
from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


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


class TodoCreate(TodoBase):
    pass


class TodoUpdate(SQLModel):
    is_completed: bool


class TodoPublic(TodoBase):
    id: int
    created_at: datetime


class Todo(TodoBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime, server_default=sa.func.now(), nullable=False),
    )
