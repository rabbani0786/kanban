import anthropic
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app import crud
from app.ai import AIConfigurationError, run_chat
from app.db import get_session
from app.models import Card, Column
from app.schemas import (
    BoardOut,
    CardOut,
    ChatRequest,
    ChatResponse,
    ColumnOut,
    CreateCardRequest,
    MoveCardRequest,
    RenameColumnRequest,
    UpdateCardRequest,
)

router = APIRouter()


def _card_out(card: Card) -> CardOut:
    return CardOut(id=card.id, title=card.title, details=card.details)


def _column_out(column: Column) -> ColumnOut:
    return ColumnOut(id=column.id, title=column.title, card_ids=[card.id for card in column.cards])


@router.get("/board", response_model=BoardOut)
def get_board(session: Session = Depends(get_session)) -> BoardOut:
    board = crud.get_the_board(session)
    columns = [_column_out(column) for column in board.columns]
    cards = {card.id: _card_out(card) for column in board.columns for card in column.cards}
    return BoardOut(columns=columns, cards=cards)


@router.patch("/columns/{column_id}", response_model=ColumnOut)
def rename_column(
    column_id: str, body: RenameColumnRequest, session: Session = Depends(get_session)
) -> ColumnOut:
    try:
        column = crud.rename_column(session, column_id, body.title)
    except crud.NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return _column_out(column)


@router.post("/columns/{column_id}/cards", response_model=CardOut, status_code=201)
def create_card(
    column_id: str, body: CreateCardRequest, session: Session = Depends(get_session)
) -> CardOut:
    try:
        card = crud.create_card(session, column_id, body.title, body.details)
    except crud.NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return _card_out(card)


@router.patch("/cards/{card_id}", response_model=CardOut)
def update_card(
    card_id: str, body: UpdateCardRequest, session: Session = Depends(get_session)
) -> CardOut:
    try:
        card = crud.update_card(session, card_id, body.title, body.details)
    except crud.NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return _card_out(card)


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, session: Session = Depends(get_session)) -> ChatResponse:
    try:
        reply = run_chat(session, body.message)
    except AIConfigurationError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    except anthropic.AnthropicError as error:
        raise HTTPException(status_code=502, detail=f"AI request failed: {error}") from error
    return ChatResponse(reply=reply)


@router.delete("/cards/{card_id}", status_code=204)
def delete_card(card_id: str, session: Session = Depends(get_session)) -> None:
    try:
        crud.delete_card(session, card_id)
    except crud.NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post("/cards/{card_id}/move", response_model=CardOut)
def move_card(
    card_id: str, body: MoveCardRequest, session: Session = Depends(get_session)
) -> CardOut:
    try:
        card = crud.move_card(session, card_id, body.to_column_id, body.to_index)
    except crud.NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return _card_out(card)
