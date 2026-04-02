from typing import Dict

from fastapi.testclient import TestClient


class TestGetProfile:
    def test_get_profile_requires_auth(self, client: TestClient) -> None:
        """GET /api/profile/me without auth returns 401."""
        resp = client.get("/api/profile/me")
        assert resp.status_code == 401

    def test_get_profile(
        self,
        client: TestClient,
        auth_headers: Dict[str, str],
    ) -> None:
        """Authenticated user can fetch their profile."""
        resp = client.get("/api/profile/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "email" in data


class TestUpdateProfile:
    def test_update_profile_requires_auth(self, client: TestClient) -> None:
        """PUT /api/profile/me without auth returns 401."""
        resp = client.put("/api/profile/me", json={"age": 25})
        assert resp.status_code == 401

    def test_update_profile(
        self,
        client: TestClient,
        auth_headers: Dict[str, str],
    ) -> None:
        """Authenticated user can update their profile fields."""
        update_data = {
            "gender": "male",
            "age": 30,
            "height_cm": 180.0,
            "weight_kg": 75.0,
        }
        resp = client.put(
            "/api/profile/me",
            json=update_data,
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["profile"]["gender"] == "male"
        assert data["profile"]["age"] == 30
        assert data["profile"]["height_cm"] == 180.0
        assert data["profile"]["weight_kg"] == 75.0
