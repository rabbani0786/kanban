from datetime import datetime

import anthropic
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlmodel import Session

from app import alerts, crud
from app.ai import AIConfigurationError, generate_bottleneck_advice, run_chat
from app.auth import (
    AuthError,
    authenticate_user,
    create_session_token,
    get_current_user,
    invalidate_session_token,
    register_user,
)
from app.config import COLUMN_CARD_LIMIT, STALE_CARD_DAYS
from app.db import get_session
from app.models import Card, Column, User
from app.schemas import (
    AuthResponse,
    BoardOut,
    BoardSummary,
    BottleneckAdviceResponse,
    BottleneckOut,
    CardOut,
    ChatRequest,
    ChatResponse,
    ColumnOut,
    CreateBoardRequest,
    CreateCardRequest,
    CurrentUserResponse,
    LoginRequest,
    MoveCardRequest,
    RegisterRequest,
    RenameBoardRequest,
    RenameColumnRequest,
    UpdateCardRequest,
)

router = APIRouter()


# ---- auth ----------------------------------------------------------------


@router.post("/auth/register", response_model=AuthResponse, status_code=201)
def register(body: RegisterRequest, session: Session = Depends(get_session)) -> AuthResponse:
    try:
        user = register_user(session, body.username, body.password)
    except AuthError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    crud.create_board(session, user.id, "My Board")
    token = create_session_token(session, user)
    return AuthResponse(token=token, username=user.username)


@router.post("/auth/login", response_model=AuthResponse)
def login(body: LoginRequest, session: Session = Depends(get_session)) -> AuthResponse:
    try:
        user = authenticate_user(session, body.username, body.password)
    except AuthError as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    token = create_session_token(session, user)
    return AuthResponse(token=token, username=user.username)


@router.post("/auth/logout", status_code=204)
def logout(
    authorization: str | None = Header(default=None), session: Session = Depends(get_session)
) -> None:
    if authorization and authorization.startswith("Bearer "):
        invalidate_session_token(session, authorization.removeprefix("Bearer ").strip())


@router.get("/auth/me", response_model=CurrentUserResponse)
def me(user: User = Depends(get_current_user)) -> CurrentUserResponse:
    return CurrentUserResponse(username=user.username)


# ---- boards ---------------------------------------------------------------


@router.get("/boards", response_model=list[BoardSummary])
def list_boards(
    user: User = Depends(get_current_user), session: Session = Depends(get_session)
) -> list[BoardSummary]:
    boards = crud.list_boards(session, user.id)
    return [BoardSummary(id=b.id, name=b.name, created_at=b.created_at) for b in boards]


@router.post("/boards", response_model=BoardSummary, status_code=201)
def create_board(
    body: CreateBoardRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BoardSummary:
    board = crud.create_board(session, user.id, body.name)
    return BoardSummary(id=board.id, name=board.name, created_at=board.created_at)


@router.patch("/boards/{board_id}", response_model=BoardSummary)
def rename_board(
    board_id: int,
    body: RenameBoardRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BoardSummary:
    try:
        board = crud.rename_board(session, board_id, user.id, body.name)
    except crud.NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return BoardSummary(id=board.id, name=board.name, created_at=board.created_at)


@router.delete("/boards/{board_id}", status_code=204)
def delete_board(
    board_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    try:
        crud.delete_board(session, board_id, user.id)
    except crud.NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


def _card_out(card: Card, now: datetime) -> CardOut:
    return CardOut(
        id=card.id,
        title=card.title,
        details=card.details,
        priority=card.priority,
        due_date=card.due_date,
        status_changed_at=card.status_changed_at,
        is_stale=alerts.is_card_stale(card.status_changed_at, now),
    )


def _column_out(column: Column) -> ColumnOut:
    return ColumnOut(
        id=column.id,
        title=column.title,
        card_ids=[card.id for card in column.cards],
        is_overloaded=alerts.is_column_overloaded(len(column.cards)),
    )


def _bottlenecks(columns: list[Column], now: datetime) -> list[BottleneckOut]:
    items: list[BottleneckOut] = []
    for column in columns:
        card_count = len(column.cards)
        if alerts.is_column_overloaded(card_count):
            items.append(
                BottleneckOut(
                    type="overloaded_column",
                    column_id=column.id,
                    column_title=column.title,
                    message=(
                        f'"{column.title}" has {card_count} cards '
                        f"(limit {COLUMN_CARD_LIMIT})."
                    ),
                )
            )
        for card in column.cards:
            if alerts.is_card_stale(card.status_changed_at, now):
                days = (now - card.status_changed_at).days
                items.append(
                    BottleneckOut(
                        type="stale_card",
                        column_id=column.id,
                        column_title=column.title,
                        card_id=card.id,
                        card_title=card.title,
                        message=(
                            f'"{card.title}" has been in "{column.title}" for {days} days.'
                        ),
                    )
                )
    return items


def _get_owned_board_or_404(session: Session, board_id: int, user: User):
    try:
        return crud.get_owned_board(session, board_id, user.id)
    except crud.NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get("/boards/{board_id}", response_model=BoardOut)
def get_board(
    board_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BoardOut:
    board = _get_owned_board_or_404(session, board_id, user)
    now = datetime.utcnow()
    columns = [_column_out(column) for column in board.columns]
    cards = {
        card.id: _card_out(card, now) for column in board.columns for card in column.cards
    }
    bottlenecks = _bottlenecks(board.columns, now)
    return BoardOut(
        id=board.id,
        name=board.name,
        columns=columns,
        cards=cards,
        bottlenecks=bottlenecks,
        stale_card_days=STALE_CARD_DAYS,
        column_card_limit=COLUMN_CARD_LIMIT,
    )


@router.patch("/boards/{board_id}/columns/{column_id}", response_model=ColumnOut)
def rename_column(
    board_id: int,
    column_id: str,
    body: RenameColumnRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ColumnOut:
    _get_owned_board_or_404(session, board_id, user)
    try:
        column = crud.rename_column(session, board_id, column_id, body.title)
    except crud.NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return _column_out(column)


@router.post(
    "/boards/{board_id}/columns/{column_id}/cards", response_model=CardOut, status_code=201
)
def create_card(
    board_id: int,
    column_id: str,
    body: CreateCardRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> CardOut:
    _get_owned_board_or_404(session, board_id, user)
    try:
        card = crud.create_card(
            session, board_id, column_id, body.title, body.details, body.priority, body.due_date
        )
    except crud.NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return _card_out(card, datetime.utcnow())


@router.patch("/boards/{board_id}/cards/{card_id}", response_model=CardOut)
def update_card(
    board_id: int,
    card_id: str,
    body: UpdateCardRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> CardOut:
    _get_owned_board_or_404(session, board_id, user)
    try:
        card = crud.update_card(
            session,
            board_id,
            card_id,
            body.title,
            body.details,
            body.priority,
            body.due_date,
            body.clear_due_date,
        )
    except crud.NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return _card_out(card, datetime.utcnow())


@router.delete("/boards/{board_id}/cards/{card_id}", status_code=204)
def delete_card(
    board_id: int,
    card_id: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    _get_owned_board_or_404(session, board_id, user)
    try:
        crud.delete_card(session, board_id, card_id)
    except crud.NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post("/boards/{board_id}/cards/{card_id}/move", response_model=CardOut)
def move_card(
    board_id: int,
    card_id: str,
    body: MoveCardRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> CardOut:
    _get_owned_board_or_404(session, board_id, user)
    try:
        card = crud.move_card(session, board_id, card_id, body.to_column_id, body.to_index)
    except crud.NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return _card_out(card, datetime.utcnow())


@router.post("/boards/{board_id}/chat", response_model=ChatResponse)
def chat(
    board_id: int,
    body: ChatRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ChatResponse:
    _get_owned_board_or_404(session, board_id, user)
    try:
        reply = run_chat(session, board_id, body.message)
    except AIConfigurationError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    except anthropic.AnthropicError as error:
        raise HTTPException(status_code=502, detail=f"AI request failed: {error}") from error
    return ChatResponse(reply=reply)


@router.post("/boards/{board_id}/bottlenecks/advice", response_model=BottleneckAdviceResponse)
def get_bottleneck_advice(
    board_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BottleneckAdviceResponse:
    board = _get_owned_board_or_404(session, board_id, user)
    now = datetime.utcnow()
    bottlenecks = _bottlenecks(board.columns, now)
    try:
        advice = generate_bottleneck_advice([b.message for b in bottlenecks])
    except AIConfigurationError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    except anthropic.AnthropicError as error:
        raise HTTPException(status_code=502, detail=f"AI request failed: {error}") from error
    return BottleneckAdviceResponse(advice=advice)
