from sqlmodel import Session, SQLModel, create_engine, select

from app.models import Board, Card, Column, User
from app.seed import seed_if_empty


def make_engine(tmp_path):
    db_path = tmp_path / "kanban.db"
    return create_engine(f"sqlite:///{db_path}")


def test_seed_creates_user_board_columns_and_cards(tmp_path):
    engine = make_engine(tmp_path)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        seed_if_empty(session)

        user = session.exec(select(User)).one()
        assert user.username == "user"

        board = session.exec(select(Board)).one()
        assert board.user_id == user.id

        columns = session.exec(select(Column).order_by(Column.position)).all()
        assert [column.title for column in columns] == [
            "Backlog",
            "To Do",
            "In Progress",
            "Review",
            "Done",
        ]
        assert all(column.board_id == board.id for column in columns)

        cards = session.exec(select(Card)).all()
        assert len(cards) == 10
        for column in columns:
            column_cards = [card for card in cards if card.column_id == column.id]
            assert len(column_cards) == 2
            assert [card.position for card in column_cards] == [0, 1]


def test_seed_is_idempotent_on_existing_db(tmp_path):
    engine = make_engine(tmp_path)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        seed_if_empty(session)

    with Session(engine) as session:
        seed_if_empty(session)

        assert len(session.exec(select(User)).all()) == 1
        assert len(session.exec(select(Board)).all()) == 1
        assert len(session.exec(select(Column)).all()) == 5
        assert len(session.exec(select(Card)).all()) == 10


def test_creates_db_file_that_does_not_exist_yet(tmp_path):
    db_path = tmp_path / "fresh.db"
    assert not db_path.exists()

    engine = create_engine(f"sqlite:///{db_path}")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        seed_if_empty(session)

    assert db_path.exists()
