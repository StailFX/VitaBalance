from typing import Dict, List

from fastapi.testclient import TestClient


class TestVitaminsList:
    def test_get_vitamins_list(self, client: TestClient) -> None:
        """GET /api/vitamins/ returns a list (possibly empty)."""
        resp = client.get("/api/vitamins/")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)


class TestSymptomsList:
    def test_get_symptoms_list(self, client: TestClient) -> None:
        """GET /api/vitamins/symptoms returns a list."""
        resp = client.get("/api/vitamins/symptoms")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)


class TestEntries:
    def test_post_entries_requires_auth(self, client: TestClient) -> None:
        """POST /api/vitamins/entries without auth returns 401."""
        resp = client.post("/api/vitamins/entries", json=[])
        assert resp.status_code == 401

    def test_post_entries(
        self,
        client: TestClient,
        auth_headers: Dict[str, str],
    ) -> None:
        """Authenticated user can submit vitamin entries."""
        # First, fetch available vitamins to get a valid vitamin_id
        vitamins_resp = client.get("/api/vitamins/")
        vitamins: List[dict] = vitamins_resp.json()

        if not vitamins:
            # No vitamins in DB -- just send an empty list
            payload: List[dict] = []
        else:
            vitamin = vitamins[0]
            payload = [
                {"vitamin_id": vitamin["id"], "value": 50.0},
            ]

        resp = client.post(
            "/api/vitamins/entries",
            json=payload,
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert "message" in resp.json()


class TestAnalysis:
    def test_get_analysis_requires_auth(self, client: TestClient) -> None:
        """GET /api/vitamins/analysis without auth returns 401."""
        resp = client.get("/api/vitamins/analysis")
        assert resp.status_code == 401

    def test_get_analysis(
        self,
        client: TestClient,
        auth_headers: Dict[str, str],
    ) -> None:
        """Authenticated user can retrieve vitamin analysis."""
        resp = client.get("/api/vitamins/analysis", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
