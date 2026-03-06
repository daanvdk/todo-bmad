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


async def test_list_todos_after_create(client: AsyncClient):
    await client.post("/todos", json={"text": "First"})
    await client.post("/todos", json={"text": "Second"})
    response = await client.get("/todos")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["text"] == "First"
    assert data[1]["text"] == "Second"
    for todo in data:
        assert "id" in todo
        assert "created_at" in todo
        assert todo["is_completed"] is False


async def test_update_todo_toggle_back(client: AsyncClient):
    create = await client.post("/todos", json={"text": "Task"})
    todo_id = create.json()["id"]
    await client.patch(f"/todos/{todo_id}", json={"is_completed": True})
    response = await client.patch(f"/todos/{todo_id}", json={"is_completed": False})
    assert response.status_code == 200
    assert response.json()["is_completed"] is False


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
