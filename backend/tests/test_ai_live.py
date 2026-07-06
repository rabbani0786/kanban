import os

import pytest
from sqlmodel import select

from app import ai
from app.models import Card

pytestmark = pytest.mark.skipif(
    not os.environ.get("ANTHROPIC_API_KEY"),
    reason="Requires a real ANTHROPIC_API_KEY to call the live Anthropic API",
)


def test_live_create_card_instruction_end_to_end(session):
    reply = ai.run_chat(
        session, "Please add a card called 'Live test card' to the Backlog column."
    )

    assert isinstance(reply, str) and reply.strip()
    card = session.exec(select(Card).where(Card.title == "Live test card")).one()
    assert card is not None
