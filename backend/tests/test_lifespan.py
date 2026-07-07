import importlib

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import User


def test_lifespan_creates_and_seeds_database(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
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


def test_lifespan_skips_seed_when_disabled(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "lifespan-no-seed.db"))
    monkeypatch.setenv("SEED_DB_ON_STARTUP", "0")

    from app import db as db_module
    from app import main as main_module

    importlib.reload(db_module)
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        response = client.get("/health")
        assert response.status_code == 200

    with Session(db_module.engine) as session:
        assert session.exec(select(User)).all() == []
