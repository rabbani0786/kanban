import os
from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

DATABASE_PATH = os.environ.get("DATABASE_PATH", "kanban.db")

engine = create_engine(f"sqlite:///{DATABASE_PATH}", connect_args={"check_same_thread": False})


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def reset_db() -> None:
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
