from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


def _require_non_blank(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        raise ValueError("must not be blank")
    return stripped


class CardOut(CamelModel):
    id: str
    title: str
    details: str
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

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        return _require_non_blank(value)


class UpdateCardRequest(CamelModel):
    title: str | None = None
    details: str | None = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str | None) -> str | None:
        return value if value is None else _require_non_blank(value)


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
