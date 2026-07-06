import uuid

from sqlmodel import Field, Relationship, SQLModel


def new_id() -> str:
    return uuid.uuid4().hex


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)

    board: "Board" = Relationship(back_populates="user")


class Board(SQLModel, table=True):
    __tablename__ = "boards"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True)

    user: User = Relationship(back_populates="board")
    columns: list["Column"] = Relationship(
        back_populates="board", sa_relationship_kwargs={"order_by": "Column.position"}
    )


class Column(SQLModel, table=True):
    __tablename__ = "columns"

    id: str = Field(default_factory=new_id, primary_key=True)
    board_id: int = Field(foreign_key="boards.id", index=True)
    title: str
    position: int

    board: Board = Relationship(back_populates="columns")
    cards: list["Card"] = Relationship(
        back_populates="column", sa_relationship_kwargs={"order_by": "Card.position"}
    )


class Card(SQLModel, table=True):
    __tablename__ = "cards"

    id: str = Field(default_factory=new_id, primary_key=True)
    column_id: str = Field(foreign_key="columns.id", index=True)
    title: str
    details: str = ""
    position: int

    column: Column = Relationship(back_populates="cards")
