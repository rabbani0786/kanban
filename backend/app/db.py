import os
from collections.abc import Generator

from sqlalchemy import inspect
from sqlmodel import Session, SQLModel, create_engine

DATABASE_URL = os.environ.get("DATABASE_URL")
DATABASE_PATH = os.environ.get("DATABASE_PATH", "kanban.db")


def _normalize_database_url(url: str) -> str:
    """Point SQLAlchemy at the psycopg driver, whatever scheme the provider handed out."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


if DATABASE_URL:
    engine = create_engine(_normalize_database_url(DATABASE_URL), pool_pre_ping=True)
else:
    engine = create_engine(f"sqlite:///{DATABASE_PATH}", connect_args={"check_same_thread": False})


def _table_columns(table: str) -> set[str]:
    return {column["name"] for column in inspect(engine).get_columns(table)}


def _add_column_if_missing(table: str, column: str, ddl_type: str, backfill_sql: str | None = None) -> None:
    if column in _table_columns(table):
        return

    with engine.begin() as connection:
        connection.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}")
        if backfill_sql:
            connection.exec_driver_sql(backfill_sql)


def _ensure_card_status_changed_at_column() -> None:
    _add_column_if_missing(
        "cards",
        "status_changed_at",
        "TIMESTAMP",
        "UPDATE cards SET status_changed_at = CURRENT_TIMESTAMP WHERE status_changed_at IS NULL",
    )


def _ensure_card_priority_and_due_date_columns() -> None:
    _add_column_if_missing(
        "cards",
        "priority",
        "VARCHAR",
        "UPDATE cards SET priority = 'medium' WHERE priority IS NULL",
    )
    _add_column_if_missing("cards", "due_date", "TIMESTAMP")


def _ensure_user_password_hash_column() -> None:
    _add_column_if_missing(
        "users",
        "password_hash",
        "VARCHAR",
        "UPDATE users SET password_hash = '' WHERE password_hash IS NULL",
    )


def _ensure_board_name_and_created_at_columns() -> None:
    _add_column_if_missing(
        "boards",
        "name",
        "VARCHAR",
        "UPDATE boards SET name = 'My Board' WHERE name IS NULL",
    )
    _add_column_if_missing(
        "boards",
        "created_at",
        "TIMESTAMP",
        "UPDATE boards SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL",
    )


def _boards_user_id_unique_name() -> str | None:
    """Return a name for the legacy unique(user_id) constraint on boards, if present.

    SQLite represents a column-level UNIQUE constraint as an autoindex that
    inspector.get_indexes() doesn't even surface (it shows up under
    get_unique_constraints() instead, with no name). Other dialects (Postgres)
    expose it as a genuinely named index or constraint.
    """
    insp = inspect(engine)
    for index in insp.get_indexes("boards"):
        if index["unique"] and index["column_names"] == ["user_id"]:
            return index["name"] or "boards_user_id_key"
    for constraint in insp.get_unique_constraints("boards"):
        if constraint["column_names"] == ["user_id"]:
            return constraint["name"] or "boards_user_id_key"
    return None


def _ensure_boards_user_id_not_unique() -> None:
    """Older schemas had a UNIQUE constraint on boards.user_id (one board per user).

    Multi-board support requires dropping it. SQLite raises the constraint from an
    implicit autoindex that DROP INDEX cannot remove, so the table has to be rebuilt
    without it. Other dialects (Postgres in production) can drop the index/constraint
    directly.
    """
    constraint_name = _boards_user_id_unique_name()
    if constraint_name is None:
        return

    if engine.dialect.name == "sqlite":
        with engine.begin() as connection:
            connection.exec_driver_sql("ALTER TABLE boards RENAME TO boards_old")
            connection.exec_driver_sql(
                "CREATE TABLE boards ("
                "id INTEGER PRIMARY KEY, "
                "user_id INTEGER NOT NULL REFERENCES users(id), "
                "name VARCHAR NOT NULL DEFAULT 'My Board', "
                "created_at TIMESTAMP"
                ")"
            )
            connection.exec_driver_sql(
                "INSERT INTO boards (id, user_id, name, created_at) "
                "SELECT id, user_id, name, created_at FROM boards_old"
            )
            connection.exec_driver_sql("DROP TABLE boards_old")
        return

    with engine.begin() as connection:
        connection.exec_driver_sql(f'DROP INDEX IF EXISTS "{index_name}"')
        connection.exec_driver_sql(
            f'ALTER TABLE boards DROP CONSTRAINT IF EXISTS "{index_name}"'
        )


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _ensure_card_status_changed_at_column()
    _ensure_card_priority_and_due_date_columns()
    _ensure_user_password_hash_column()
    _ensure_board_name_and_created_at_columns()
    _ensure_boards_user_id_not_unique()


def reset_db() -> None:
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
