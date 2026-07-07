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


def _ensure_card_status_changed_at_column() -> None:
    columns = {column["name"] for column in inspect(engine).get_columns("cards")}
    if "status_changed_at" in columns:
        return

    with engine.begin() as connection:
        connection.exec_driver_sql("ALTER TABLE cards ADD COLUMN status_changed_at TIMESTAMP")
        connection.exec_driver_sql(
            "UPDATE cards SET status_changed_at = CURRENT_TIMESTAMP WHERE status_changed_at IS NULL"
        )


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _ensure_card_status_changed_at_column()


def reset_db() -> None:
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
