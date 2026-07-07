import importlib

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_allows_the_frontend_origin() -> None:
    response = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_cors_allows_origins_from_env_override(monkeypatch) -> None:
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://kanban-frontend.vercel.app, https://example.com")

    from app import main as main_module

    importlib.reload(main_module)
    try:
        reloaded_client = TestClient(main_module.app)
        response = reloaded_client.get(
            "/health", headers={"Origin": "https://kanban-frontend.vercel.app"}
        )
        assert (
            response.headers.get("access-control-allow-origin")
            == "https://kanban-frontend.vercel.app"
        )

        blocked = reloaded_client.get("/health", headers={"Origin": "http://localhost:3000"})
        assert "access-control-allow-origin" not in blocked.headers
    finally:
        monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
        importlib.reload(main_module)
