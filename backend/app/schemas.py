from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel

PRIORITIES = ("low", "medium", "high")


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


def _require_non_blank(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        raise ValueError("must not be blank")
    return stripped


def _validate_priority(value: str) -> str:
    if value not in PRIORITIES:
        raise ValueError(f"priority must be one of {PRIORITIES}")
    return value


class RegisterRequest(CamelModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_not_blank(cls, value: str) -> str:
        return _require_non_blank(value)

    @field_validator("password")
    @classmethod
    def password_min_length(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("password must be at least 8 characters")
        return value


class LoginRequest(CamelModel):
    username: str
    password: str


class AuthResponse(CamelModel):
    token: str
    username: str


class CurrentUserResponse(CamelModel):
    username: str


class BoardSummary(CamelModel):
    id: int
    name: str
    created_at: datetime


class CreateBoardRequest(CamelModel):
    name: str = "My Board"

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        return _require_non_blank(value)


class RenameBoardRequest(CamelModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        return _require_non_blank(value)


class CardOut(CamelModel):
    id: str
    title: str
    details: str
    priority: str
    due_date: datetime | None
    status_changed_at: datetime
    is_stale: bool


class ColumnOut(CamelModel):
    id: str
    title: str
    card_ids: list[str]
    is_overloaded: bool


class BottleneckOut(CamelModel):
    type: Literal["stale_card", "overloaded_column"]
    column_id: str
    column_title: str
    card_id: str | None = None
    card_title: str | None = None
    message: str


class BoardOut(CamelModel):
    id: int
    name: str
    columns: list[ColumnOut]
    cards: dict[str, CardOut]
    bottlenecks: list[BottleneckOut]
    stale_card_days: float
    column_card_limit: int


class RenameColumnRequest(CamelModel):
    title: str

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        return _require_non_blank(value)


class CreateCardRequest(CamelModel):
    title: str
    details: str = ""
    priority: str = "medium"
    due_date: datetime | None = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        return _require_non_blank(value)

    @field_validator("priority")
    @classmethod
    def priority_valid(cls, value: str) -> str:
        return _validate_priority(value)


class UpdateCardRequest(CamelModel):
    title: str | None = None
    details: str | None = None
    priority: str | None = None
    due_date: datetime | None = None
    clear_due_date: bool = False

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str | None) -> str | None:
        return value if value is None else _require_non_blank(value)

    @field_validator("priority")
    @classmethod
    def priority_valid(cls, value: str | None) -> str | None:
        return value if value is None else _validate_priority(value)


class MoveCardRequest(CamelModel):
    to_column_id: str
    to_index: int


class ChatRequest(CamelModel):
    message: str

    @field_validator("message")
    @classmethod
    def message_not_blank(cls, value: str) -> str:
        return _require_non_blank(value)


class ChatResponse(CamelModel):
    reply: str


class BottleneckAdviceResponse(CamelModel):
    advice: str
