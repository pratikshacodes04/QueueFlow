import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Create test client with lifecycle management."""
    with TestClient(app) as c:
        yield c


def test_root_endpoint(client):
    """Verify that root endpoint returns HTTP 200 with metadata and links."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["app"] == "QueueFlow API"
    assert data["docs_url"] == "/docs"
    assert data["health_url"] == "/health"


def test_health_endpoint(client):
    """Verify that health endpoint returns HTTP 200 and schema compliant health report."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ("healthy", "degraded")
    assert "database" in data
    assert "connected" in data["database"]
    assert "timestamp" in data
    assert data["app"] == "QueueFlow API"


def test_api_health_alias(client):
    """Verify that /api/health alias functions identically to /health."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
