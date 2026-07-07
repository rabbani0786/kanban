from types import SimpleNamespace
from unittest.mock import MagicMock

import anthropic
import pytest
from sqlmodel import select

from app import ai
from app.models import Card, Column


def text_block(text):
    return SimpleNamespace(type="text", text=text)


def tool_use_block(name, tool_input, block_id="toolu_1"):
    return SimpleNamespace(type="tool_use", name=name, input=tool_input, id=block_id)


def fake_response(stop_reason, content):
    return SimpleNamespace(stop_reason=stop_reason, content=content)


def mock_anthropic(monkeypatch, responses):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    client = MagicMock()
    client.messages.create.side_effect = responses
    monkeypatch.setattr(anthropic, "Anthropic", lambda: client)
    return client


def test_raises_a_configuration_error_when_no_api_key_is_set(session, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    with pytest.raises(ai.AIConfigurationError):
        ai.run_chat(session, "hi")


def test_replies_directly_when_no_tool_is_needed(session, monkeypatch):
    mock_anthropic(monkeypatch, [fake_response("end_turn", [text_block("Hello there!")])])

    reply = ai.run_chat(session, "hi")

    assert reply == "Hello there!"


def test_creates_a_card_via_tool_call(session, monkeypatch):
    mock_anthropic(
        monkeypatch,
        [
            fake_response(
                "tool_use",
                [
                    tool_use_block(
                        "create_card",
                        {"column_title": "Backlog", "title": "New task", "details": "desc"},
                    )
                ],
            ),
            fake_response("end_turn", [text_block("Added the card.")]),
        ],
    )

    reply = ai.run_chat(session, "add a card called New task to backlog")

    assert reply == "Added the card."
    card = session.exec(select(Card).where(Card.title == "New task")).one()
    assert card.details == "desc"


def test_edits_a_card_via_tool_call(session, monkeypatch):
    mock_anthropic(
        monkeypatch,
        [
            fake_response(
                "tool_use",
                [
                    tool_use_block(
                        "edit_card",
                        {"card_title": "Customer login page redesign", "new_title": "Sign-in page redesign"},
                    )
                ],
            ),
            fake_response("end_turn", [text_block("Renamed it.")]),
        ],
    )

    reply = ai.run_chat(session, "rename Customer login page redesign to Sign-in page redesign")

    assert reply == "Renamed it."
    assert session.exec(select(Card).where(Card.title == "Sign-in page redesign")).one()


def test_moves_a_card_via_tool_call(session, monkeypatch):
    mock_anthropic(
        monkeypatch,
        [
            fake_response(
                "tool_use",
                [
                    tool_use_block(
                        "move_card",
                        {"card_title": "Customer login page redesign", "to_column_title": "Done"},
                    )
                ],
            ),
            fake_response("end_turn", [text_block("Moved it.")]),
        ],
    )

    reply = ai.run_chat(session, "move Customer login page redesign to Done")

    assert reply == "Moved it."
    card = session.exec(select(Card).where(Card.title == "Customer login page redesign")).one()
    done_column = session.exec(select(Column).where(Column.title == "Done")).one()
    assert card.column_id == done_column.id


def test_reports_a_tool_error_back_to_the_model(session, monkeypatch):
    client = mock_anthropic(
        monkeypatch,
        [
            fake_response(
                "tool_use",
                [tool_use_block("move_card", {"card_title": "Nope", "to_column_title": "Done"})],
            ),
            fake_response("end_turn", [text_block("I couldn't find that card.")]),
        ],
    )

    reply = ai.run_chat(session, "move Nope to Done")

    assert reply == "I couldn't find that card."
    second_call_messages = client.messages.create.call_args_list[1].kwargs["messages"]
    tool_result = second_call_messages[-1]["content"][0]
    assert tool_result["is_error"] is True
    assert "Nope" in tool_result["content"]


def test_run_tool_create_card_with_unknown_column(session):
    message, is_error = ai._run_tool(
        session, "create_card", {"column_title": "Nope", "title": "X"}
    )

    assert is_error is True
    assert "No column titled 'Nope'" in message


def test_run_tool_edit_card_with_unknown_card(session):
    message, is_error = ai._run_tool(session, "edit_card", {"card_title": "Nope"})

    assert is_error is True
    assert "No card titled 'Nope'" in message


def test_run_tool_move_card_with_unknown_target_column(session):
    message, is_error = ai._run_tool(
        session,
        "move_card",
        {"card_title": "Customer login page redesign", "to_column_title": "Nope"},
    )

    assert is_error is True
    assert "No column titled 'Nope'" in message


def test_run_tool_unknown_tool_name(session):
    message, is_error = ai._run_tool(session, "not_a_real_tool", {})

    assert is_error is True
    assert "Unknown tool" in message


def test_stops_after_max_iterations(session, monkeypatch):
    always_tool_use = fake_response(
        "tool_use",
        [tool_use_block("move_card", {"card_title": "Nope", "to_column_title": "Nope"})],
    )
    mock_anthropic(monkeypatch, [always_tool_use] * ai.MAX_TOOL_ITERATIONS)

    reply = ai.run_chat(session, "keep trying forever")

    assert "ran out of steps" in reply


def test_advice_raises_a_configuration_error_when_no_api_key_is_set(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    with pytest.raises(ai.AIConfigurationError):
        ai.generate_bottleneck_advice(['"Migrate DB" has been in "Review" for 6 days.'])


def test_advice_returns_the_model_reply(monkeypatch):
    client = mock_anthropic(monkeypatch, [fake_response("end_turn", [text_block("Pair on it today.")])])

    advice = ai.generate_bottleneck_advice(['"Migrate DB" has been in "Review" for 6 days.'])

    assert advice == "Pair on it today."
    sent_message = client.messages.create.call_args.kwargs["messages"][0]["content"]
    assert "Migrate DB" in sent_message


def test_advice_tells_the_model_when_there_are_no_bottlenecks(monkeypatch):
    client = mock_anthropic(monkeypatch, [fake_response("end_turn", [text_block("Board looks healthy.")])])

    advice = ai.generate_bottleneck_advice([])

    assert advice == "Board looks healthy."
    sent_message = client.messages.create.call_args.kwargs["messages"][0]["content"]
    assert "no bottlenecks" in sent_message
