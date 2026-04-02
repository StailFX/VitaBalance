import uuid
from typing import Dict

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Create a TestClient that wraps the FastAPI app."""
    with TestClient(app) as c:
        yield c


def _unique_email() -> str:
    """Generate a unique email to avoid collisions between test runs."""
    short_id = uuid.uuid4().hex[:8]
    return f"testuser_{short_id}@example.com"


@pytest.fixture(scope="session")
def test_user_credentials() -> Dict[str, str]:
    """Return a unique email/password pair shared across the session."""
    return {
        "email": _unique_email(),
        "password": "TestPassword123!",
    }


@pytest.fixture(scope="session")
def registered_user(
    client: TestClient,
    test_user_credentials: Dict[str, str],
) -> Dict[str, str]:
    """Register a user and return the credentials dict."""
    resp = client.post(
        "/api/auth/register",
        json={
            "email": test_user_credentials["email"],
            "password": test_user_credentials["password"],
        },
    )
    assert resp.status_code == 201, f"Registration failed: {resp.text}"
    return test_user_credentials


@pytest.fixture(scope="session")
def auth_headers(
    client: TestClient,
    registered_user: Dict[str, str],
) -> Dict[str, str]:
    """Log in the registered user and return Authorization headers."""
    resp = client.post(
        "/api/auth/login",
        data={
            "username": registered_user["email"],
            "password": registered_user["password"],
        },
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
