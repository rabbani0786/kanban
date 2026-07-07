import importlib

from sqlmodel import select

from app.models import User


def test_init_db_and_get_session(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "kanban.db"))

    from app import db as db_module

    importlib.reload(db_module)

    db_module.init_db()

    session_gen = db_module.get_session()
    session = next(session_gen)
    try:
        assert session.exec(select(User)).all() == []
    finally:
        session_gen.close()

    assert (tmp_path / "kanban.db").exists()


def test_database_path_defaults_to_kanban_db(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("DATABASE_PATH", raising=False)

    from app import db as db_module

    importlib.reload(db_module)

    assert db_module.DATABASE_PATH == "kanban.db"
