import uuid
from typing import Dict

from fastapi.testclient import TestClient


class TestRegister:
    def test_register_success(self, client: TestClient) -> None:
        """A new user can register successfully."""
        email = f"reg_ok_{uuid.uuid4().hex[:8]}@example.com"
        resp = client.post(
            "/api/auth/register",
            json={"email": email, "password": "StrongPass1!"},
        )
        assert resp.status_code == 201
        assert "message" in resp.json()

    def test_register_duplicate_email(
        self,
        client: TestClient,
        registered_user: Dict[str, str],
    ) -> None:
        """Registering with an already-used email returns 400."""
        resp = client.post(
            "/api/auth/register",
            json={
                "email": registered_user["email"],
                "password": "AnotherPass1!",
            },
        )
        assert resp.status_code == 400
        assert "detail" in resp.json()


class TestLogin:
    def test_login_success(
        self,
        client: TestClient,
        registered_user: Dict[str, str],
    ) -> None:
        """A registered user can log in and receives an access token."""
        resp = client.post(
            "/api/auth/login",
            data={
                "username": registered_user["email"],
                "password": registered_user["password"],
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body.get("token_type") == "bearer"

    def test_login_wrong_password(
        self,
        client: TestClient,
        registered_user: Dict[str, str],
    ) -> None:
        """Login with an incorrect password returns 401."""
        resp = client.post(
            "/api/auth/login",
            data={
                "username": registered_user["email"],
                "password": "WrongPassword999!",
            },
        )
        assert resp.status_code == 401
