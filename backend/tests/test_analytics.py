import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_analytics_unauthenticated_returns_401(client: TestClient):
    response = client.get("/analytics/overview")
    assert response.status_code == 401
    assert "detail" in response.json()

def test_analytics_route_registered():
    paths = app.openapi()["paths"]
    assert "/analytics/overview" in paths
    assert "get" in paths["/analytics/overview"]

