from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_openapi_spec_served():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert data["openapi"].startswith("3.")
    assert data["info"]["title"] == "todo-bmad API"
