from sqlmodel import Session, select

from app.models import Board, Card, Column


class NotFoundError(Exception):
    pass


def get_the_board(session: Session) -> Board:
    board = session.exec(select(Board)).first()
    if board is None:
        raise NotFoundError("board not found")
    return board


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


def rename_column(session: Session, column_id: str, title: str) -> Column:
    column = session.get(Column, column_id)
    if column is None:
        raise NotFoundError(f"column {column_id} not found")

    column.title = title
    session.add(column)
    session.commit()
    session.refresh(column)
    return column


def create_card(session: Session, column_id: str, title: str, details: str) -> Card:
    column = session.get(Column, column_id)
    if column is None:
        raise NotFoundError(f"column {column_id} not found")

    position = len(_cards_in_column(session, column_id))
    card = Card(column_id=column_id, title=title, details=details, position=position)
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


def update_card(session: Session, card_id: str, title: str | None, details: str | None) -> Card:
    card = session.get(Card, card_id)
    if card is None:
        raise NotFoundError(f"card {card_id} not found")

    if title is not None:
        card.title = title
    if details is not None:
        card.details = details

    session.add(card)
    session.commit()
    session.refresh(card)
    return card


def delete_card(session: Session, card_id: str) -> None:
    card = session.get(Card, card_id)
    if card is None:
        raise NotFoundError(f"card {card_id} not found")

    column_id = card.column_id
    session.delete(card)
    session.commit()

    _renumber(session, _cards_in_column(session, column_id))
    session.commit()


def move_card(session: Session, card_id: str, to_column_id: str, to_index: int) -> Card:
    card = session.get(Card, card_id)
    if card is None:
        raise NotFoundError(f"card {card_id} not found")

    target_column = session.get(Column, to_column_id)
    if target_column is None:
        raise NotFoundError(f"column {to_column_id} not found")

    from_column_id = card.column_id
    same_column = from_column_id == to_column_id

    remaining_source_cards = [
        c for c in _cards_in_column(session, from_column_id) if c.id != card_id
    ]
    target_cards = (
        remaining_source_cards if same_column else _cards_in_column(session, to_column_id)
    )

    clamped_index = max(0, min(to_index, len(target_cards)))
    target_cards.insert(clamped_index, card)
    card.column_id = to_column_id

    _renumber(session, target_cards)
    if not same_column:
        _renumber(session, remaining_source_cards)

    session.commit()
    session.refresh(card)
    return card
