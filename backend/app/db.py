import os
from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

DATABASE_PATH = os.environ.get("DATABASE_PATH", "kanban.db")

engine = create_engine(f"sqlite:///{DATABASE_PATH}", connect_args={"check_same_thread": False})


def _ensure_card_status_changed_at_column() -> None:
    with engine.connect() as connection:
        columns = connection.exec_driver_sql("PRAGMA table_info(cards)").fetchall()
        column_names = {row[1] for row in columns}
        if "status_changed_at" in column_names:
            return

        connection.exec_driver_sql("ALTER TABLE cards ADD COLUMN status_changed_at TIMESTAMP")
        connection.exec_driver_sql(
            "UPDATE cards SET status_changed_at = CURRENT_TIMESTAMP WHERE status_changed_at IS NULL"
        )
        connection.commit()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _ensure_card_status_changed_at_column()


def reset_db() -> None:
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
