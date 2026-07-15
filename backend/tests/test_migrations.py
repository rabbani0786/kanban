import importlib

from sqlalchemy import inspect
from sqlmodel import Session, select


def _create_legacy_schema(engine) -> None:
    """Mimic the pre-multi-board, pre-auth schema this app used to ship."""
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR UNIQUE)"
        )
        connection.exec_driver_sql(
            "CREATE TABLE boards (id INTEGER PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id))"
        )
        connection.exec_driver_sql(
            "CREATE TABLE columns (id VARCHAR PRIMARY KEY, board_id INTEGER, title VARCHAR, position INTEGER)"
        )
        connection.exec_driver_sql(
            "CREATE TABLE cards (id VARCHAR PRIMARY KEY, column_id VARCHAR, title VARCHAR, "
            "details VARCHAR, position INTEGER, status_changed_at TIMESTAMP)"
        )
        connection.exec_driver_sql("INSERT INTO users (id, username) VALUES (1, 'user')")
        connection.exec_driver_sql("INSERT INTO boards (id, user_id) VALUES (1, 1)")


def test_init_db_upgrades_a_legacy_single_board_schema(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "legacy.db"))

    from app import db as db_module

    importlib.reload(db_module)
    _create_legacy_schema(db_module.engine)

    db_module.init_db()

    columns = {c["name"] for c in inspect(db_module.engine).get_columns("users")}
    assert "password_hash" in columns

    board_columns = {c["name"] for c in inspect(db_module.engine).get_columns("boards")}
    assert {"name", "created_at"} <= board_columns

    card_columns = {c["name"] for c in inspect(db_module.engine).get_columns("cards")}
    assert {"priority", "due_date"} <= card_columns

    unique_user_id_indexes = [
        index
        for index in inspect(db_module.engine).get_indexes("boards")
        if index["unique"] and index["column_names"] == ["user_id"]
    ]
    assert unique_user_id_indexes == []

    from app.models import Board

    with Session(db_module.engine) as session:
        session.add(Board(user_id=1, name="Second board"))
        session.commit()

        boards = session.exec(select(Board).where(Board.user_id == 1)).all()
        assert len(boards) == 2


def test_init_db_is_a_no_op_on_an_already_current_schema(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "current.db"))

    from app import db as db_module

    importlib.reload(db_module)

    db_module.init_db()
    db_module.init_db()

    columns = {c["name"] for c in inspect(db_module.engine).get_columns("cards")}
    assert {"priority", "due_date", "status_changed_at"} <= columns
