from datetime import datetime

from sqlmodel import Session, select

from app.models import Board, Card, Column

DEFAULT_COLUMN_TITLES = ["Backlog", "To Do", "In Progress", "Review", "Done"]


class NotFoundError(Exception):
    pass


def list_boards(session: Session, user_id: int) -> list[Board]:
    return list(
        session.exec(
            select(Board).where(Board.user_id == user_id).order_by(Board.created_at)
        ).all()
    )


def get_board(session: Session, board_id: int) -> Board:
    board = session.get(Board, board_id)
    if board is None:
        raise NotFoundError(f"board {board_id} not found")
    return board


def get_owned_board(session: Session, board_id: int, user_id: int) -> Board:
    board = session.get(Board, board_id)
    if board is None or board.user_id != user_id:
        raise NotFoundError(f"board {board_id} not found")
    return board


def create_board(session: Session, user_id: int, name: str) -> Board:
    board = Board(user_id=user_id, name=name)
    session.add(board)
    session.flush()

    for position, title in enumerate(DEFAULT_COLUMN_TITLES):
        session.add(Column(board_id=board.id, title=title, position=position))

    session.commit()
    session.refresh(board)
    return board


def rename_board(session: Session, board_id: int, user_id: int, name: str) -> Board:
    board = get_owned_board(session, board_id, user_id)
    board.name = name
    session.add(board)
    session.commit()
    session.refresh(board)
    return board


def delete_board(session: Session, board_id: int, user_id: int) -> None:
    board = get_owned_board(session, board_id, user_id)
    session.delete(board)
    session.commit()


def _column_in_board(session: Session, board_id: int, column_id: str) -> Column:
    column = session.get(Column, column_id)
    if column is None or column.board_id != board_id:
        raise NotFoundError(f"column {column_id} not found")
    return column


def _card_in_board(session: Session, board_id: int, card_id: str) -> Card:
    card = session.get(Card, card_id)
    if card is None:
        raise NotFoundError(f"card {card_id} not found")
    column = session.get(Column, card.column_id)
    if column is None or column.board_id != board_id:
        raise NotFoundError(f"card {card_id} not found")
    return card


def _cards_in_column(session: Session, column_id: str) -> list[Card]:
    return list(
        session.exec(
            select(Card).where(Card.column_id == column_id).order_by(Card.position)
        ).all()
    )


def _renumber(session: Session, cards: list[Card]) -> None:
    for index, card in enumerate(cards):
        card.position = index
        session.add(card)


def rename_column(session: Session, board_id: int, column_id: str, title: str) -> Column:
    column = _column_in_board(session, board_id, column_id)
    column.title = title
    session.add(column)
    session.commit()
    session.refresh(column)
    return column


def create_card(
    session: Session,
    board_id: int,
    column_id: str,
    title: str,
    details: str,
    priority: str = "medium",
    due_date: datetime | None = None,
) -> Card:
    column = _column_in_board(session, board_id, column_id)

    position = len(_cards_in_column(session, column.id))
    card = Card(
        column_id=column.id,
        title=title,
        details=details,
        priority=priority,
        due_date=due_date,
        position=position,
    )
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


def update_card(
    session: Session,
    board_id: int,
    card_id: str,
    title: str | None,
    details: str | None,
    priority: str | None = None,
    due_date: datetime | None = None,
    clear_due_date: bool = False,
) -> Card:
    card = _card_in_board(session, board_id, card_id)

    if title is not None:
        card.title = title
    if details is not None:
        card.details = details
    if priority is not None:
        card.priority = priority
    if clear_due_date:
        card.due_date = None
    elif due_date is not None:
        card.due_date = due_date

    session.add(card)
    session.commit()
    session.refresh(card)
    return card


def delete_card(session: Session, board_id: int, card_id: str) -> None:
    card = _card_in_board(session, board_id, card_id)

    column_id = card.column_id
    session.delete(card)
    session.commit()

    _renumber(session, _cards_in_column(session, column_id))
    session.commit()


def move_card(
    session: Session, board_id: int, card_id: str, to_column_id: str, to_index: int
) -> Card:
    card = _card_in_board(session, board_id, card_id)
    target_column = _column_in_board(session, board_id, to_column_id)

    from_column_id = card.column_id
    same_column = from_column_id == to_column_id

    remaining_source_cards = [
        c for c in _cards_in_column(session, from_column_id) if c.id != card_id
    ]
    target_cards = (
        remaining_source_cards if same_column else _cards_in_column(session, target_column.id)
    )

    clamped_index = max(0, min(to_index, len(target_cards)))
    target_cards.insert(clamped_index, card)
    card.column_id = to_column_id
    if not same_column:
        card.status_changed_at = datetime.utcnow()

    _renumber(session, target_cards)
    if not same_column:
        _renumber(session, remaining_source_cards)

    session.commit()
    session.refresh(card)
    return card
