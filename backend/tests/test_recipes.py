from typing import Dict

from fastapi.testclient import TestClient


class TestRecommendedRecipes:
    def test_get_recommended_recipes_requires_auth(
        self, client: TestClient
    ) -> None:
        """GET /api/recipes/recommended without auth returns 401."""
        resp = client.get("/api/recipes/recommended")
        assert resp.status_code == 401

    def test_get_recommended_recipes(
        self,
        client: TestClient,
        auth_headers: Dict[str, str],
    ) -> None:
        """Authenticated user can fetch recommended recipes."""
        resp = client.get("/api/recipes/recommended", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
