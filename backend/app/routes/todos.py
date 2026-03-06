from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models import Todo, TodoCreate, TodoPublic, TodoUpdate

router = APIRouter(prefix="/todos", tags=["todos"])


@router.get("", response_model=list[TodoPublic], operation_id="listTodos")
async def list_todos(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Todo).order_by(col(Todo.created_at)))
    return result.all()


@router.post("", response_model=TodoPublic, status_code=201, operation_id="createTodo")
async def create_todo(todo: TodoCreate, session: AsyncSession = Depends(get_session)):
    db_todo = Todo.model_validate(todo)
    session.add(db_todo)
    await session.commit()
    await session.refresh(db_todo)
    return db_todo


@router.patch("/{todo_id}", response_model=TodoPublic, operation_id="updateTodo")
async def update_todo(
    todo_id: int,
    update: TodoUpdate,
    session: AsyncSession = Depends(get_session),
):
    todo = await session.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    todo.is_completed = update.is_completed
    session.add(todo)
    await session.commit()
    await session.refresh(todo)
    return todo


@router.delete("/{todo_id}", status_code=204, operation_id="deleteTodo")
async def delete_todo(todo_id: int, session: AsyncSession = Depends(get_session)):
    todo = await session.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    await session.delete(todo)
    await session.commit()
