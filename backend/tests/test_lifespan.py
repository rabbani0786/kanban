import importlib

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import User


def test_lifespan_creates_and_seeds_database(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "lifespan.db"))

    from app import db as db_module
    from app import main as main_module

    importlib.reload(db_module)
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        response = client.get("/health")
        assert response.status_code == 200

    with Session(db_module.engine) as session:
        user = session.exec(select(User)).one()
        assert user.username == "user"
