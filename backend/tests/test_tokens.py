import pytest
from fastapi.testclient import TestClient
from main import app

# Helper to check unauthenticated access returns 401
ENDPOINTS = [
    ("POST", "/queues/123abc/tokens"),
    ("GET", "/queues/123abc/tokens"),
    ("GET", "/tokens/123abc"),
    ("POST", "/tokens/123abc/move"),
    ("PATCH", "/tokens/123abc/cancel"),
    ("POST", "/queues/123abc/tokens/call-next"),
    ("PATCH", "/tokens/123abc/complete"),
    ("GET", "/queues/123abc/tokens/stats"),
]

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.mark.parametrize("method, path", ENDPOINTS)
def test_unauthenticated_returns_401(client: TestClient, method: str, path: str):
    response = client.request(method, path)
    assert response.status_code == 401
    assert "detail" in response.json()

def test_token_router_registered():
    # Ensure token routes are part of the FastAPI app OpenAPI schema
    route_paths = set(app.openapi()["paths"].keys())
    expected_templates = [
        "/queues/{queue_id}/tokens",
        "/tokens/{token_id}",
        "/tokens/{token_id}/move",
        "/tokens/{token_id}/cancel",
        "/queues/{queue_id}/tokens/call-next",
        "/tokens/{token_id}/complete",
        "/queues/{queue_id}/tokens/stats",
    ]
    for template in expected_templates:
        assert template in route_paths, f"Route template {template} not registered"
