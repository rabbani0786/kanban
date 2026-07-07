from datetime import datetime, timedelta

import anthropic

from app import routes
from app.ai import AIConfigurationError
from app.config import COLUMN_CARD_LIMIT, STALE_CARD_DAYS
from app.models import Card


def test_chat_maps_a_missing_api_key_to_502(client, monkeypatch):
    def raise_error(session, message):
        raise AIConfigurationError("ANTHROPIC_API_KEY is not configured.")

    monkeypatch.setattr(routes, "run_chat", raise_error)

    response = client.post("/chat", json={"message": "add a card"})

    assert response.status_code == 502
    assert "ANTHROPIC_API_KEY" in response.json()["detail"]


def test_chat_returns_the_model_reply(client, monkeypatch):
    monkeypatch.setattr(routes, "run_chat", lambda session, message: "Done!")

    response = client.post("/chat", json={"message": "add a card"})

    assert response.status_code == 200
    assert response.json() == {"reply": "Done!"}


def test_chat_rejects_a_blank_message(client):
    response = client.post("/chat", json={"message": "   "})

    assert response.status_code == 422


def test_chat_maps_an_anthropic_error_to_502(client, monkeypatch):
    def raise_error(session, message):
        raise anthropic.AnthropicError("no api key configured")

    monkeypatch.setattr(routes, "run_chat", raise_error)

    response = client.post("/chat", json={"message": "add a card"})

    assert response.status_code == 502


def test_get_board_returns_seeded_columns_and_cards(client):
    response = client.get("/board")
    assert response.status_code == 200

    body = response.json()
    assert [column["title"] for column in body["columns"]] == [
        "Backlog",
        "To Do",
        "In Progress",
        "Review",
        "Done",
    ]
    assert len(body["cards"]) == 10
    backlog = body["columns"][0]
    assert len(backlog["cardIds"]) == 2
    for card_id in backlog["cardIds"]:
        assert card_id in body["cards"]


def test_rename_column(client):
    board = client.get("/board").json()
    column_id = board["columns"][1]["id"]

    response = client.patch(f"/columns/{column_id}", json={"title": "  Ready  "})

    assert response.status_code == 200
    assert response.json()["title"] == "Ready"

    board_after = client.get("/board").json()
    assert board_after["columns"][1]["title"] == "Ready"


def test_rename_column_rejects_blank_title(client):
    board = client.get("/board").json()
    column_id = board["columns"][0]["id"]

    response = client.patch(f"/columns/{column_id}", json={"title": "   "})

    assert response.status_code == 422


def test_rename_column_404_for_unknown_column(client):
    response = client.patch("/columns/does-not-exist", json={"title": "New"})

    assert response.status_code == 404


def test_create_card_appends_to_column(client):
    board = client.get("/board").json()
    column_id = board["columns"][0]["id"]

    response = client.post(
        f"/columns/{column_id}/cards", json={"title": "New task", "details": "Some details"}
    )

    assert response.status_code == 201
    card = response.json()
    assert card["title"] == "New task"
    assert card["details"] == "Some details"

    board_after = client.get("/board").json()
    backlog = board_after["columns"][0]
    assert backlog["cardIds"][-1] == card["id"]
    assert len(backlog["cardIds"]) == 3


def test_create_card_defaults_details_to_empty_string(client):
    board = client.get("/board").json()
    column_id = board["columns"][0]["id"]

    response = client.post(f"/columns/{column_id}/cards", json={"title": "No details"})

    assert response.status_code == 201
    assert response.json()["details"] == ""


def test_create_card_rejects_blank_title(client):
    board = client.get("/board").json()
    column_id = board["columns"][0]["id"]

    response = client.post(f"/columns/{column_id}/cards", json={"title": "   "})

    assert response.status_code == 422


def test_create_card_404_for_unknown_column(client):
    response = client.post("/columns/does-not-exist/cards", json={"title": "New task"})

    assert response.status_code == 404


def test_update_card_title_and_details(client):
    board = client.get("/board").json()
    card_id = next(iter(board["cards"]))

    response = client.patch(f"/cards/{card_id}", json={"title": "Updated", "details": "Changed"})

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Updated"
    assert body["details"] == "Changed"


def test_update_card_partial_update_keeps_other_field(client):
    board = client.get("/board").json()
    card_id = next(iter(board["cards"]))
    original_details = board["cards"][card_id]["details"]

    response = client.patch(f"/cards/{card_id}", json={"title": "Only title changed"})

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Only title changed"
    assert body["details"] == original_details


def test_update_card_rejects_blank_title(client):
    board = client.get("/board").json()
    card_id = next(iter(board["cards"]))

    response = client.patch(f"/cards/{card_id}", json={"title": "   "})

    assert response.status_code == 422


def test_update_card_404_for_unknown_card(client):
    response = client.patch("/cards/does-not-exist", json={"title": "New"})

    assert response.status_code == 404


def test_delete_card_removes_it_from_board(client):
    board = client.get("/board").json()
    card_id = next(iter(board["cards"]))

    response = client.delete(f"/cards/{card_id}")

    assert response.status_code == 204

    board_after = client.get("/board").json()
    assert card_id not in board_after["cards"]
    assert len(board_after["cards"]) == 9


def test_delete_card_404_for_unknown_card(client):
    response = client.delete("/cards/does-not-exist")

    assert response.status_code == 404


def test_move_card_to_another_column(client):
    board = client.get("/board").json()
    done_id = board["columns"][4]["id"]
    card_id = board["columns"][0]["cardIds"][0]

    response = client.post(f"/cards/{card_id}/move", json={"toColumnId": done_id, "toIndex": 0})

    assert response.status_code == 200

    board_after = client.get("/board").json()
    assert card_id not in board_after["columns"][0]["cardIds"]
    assert board_after["columns"][4]["cardIds"][0] == card_id
    assert board_after["columns"][0]["cardIds"] == [board["columns"][0]["cardIds"][1]]


def test_move_card_reorders_within_same_column(client):
    board = client.get("/board").json()
    backlog_id = board["columns"][0]["id"]
    first_card, second_card = board["columns"][0]["cardIds"]

    response = client.post(
        f"/cards/{first_card}/move", json={"toColumnId": backlog_id, "toIndex": 1}
    )

    assert response.status_code == 200

    board_after = client.get("/board").json()
    assert board_after["columns"][0]["cardIds"] == [second_card, first_card]


def test_move_card_clamps_out_of_range_index(client):
    board = client.get("/board").json()
    done_id = board["columns"][4]["id"]
    card_id = board["columns"][0]["cardIds"][0]

    response = client.post(f"/cards/{card_id}/move", json={"toColumnId": done_id, "toIndex": 999})

    assert response.status_code == 200

    board_after = client.get("/board").json()
    assert board_after["columns"][4]["cardIds"][-1] == card_id


def test_move_card_404_for_unknown_card(client):
    board = client.get("/board").json()
    done_id = board["columns"][4]["id"]

    response = client.post("/cards/does-not-exist/move", json={"toColumnId": done_id, "toIndex": 0})

    assert response.status_code == 404


def test_move_card_404_for_unknown_target_column(client):
    board = client.get("/board").json()
    card_id = board["columns"][0]["cardIds"][0]

    response = client.post(
        f"/cards/{card_id}/move", json={"toColumnId": "does-not-exist", "toIndex": 0}
    )

    assert response.status_code == 404


def test_deleting_the_last_card_in_a_column_leaves_it_empty(client):
    board = client.get("/board").json()
    backlog = board["columns"][0]
    assert len(backlog["cardIds"]) == 2

    for card_id in backlog["cardIds"]:
        response = client.delete(f"/cards/{card_id}")
        assert response.status_code == 204

    board_after = client.get("/board").json()
    assert board_after["columns"][0]["cardIds"] == []

    # The now-empty column must still accept a new card.
    response = client.post(f"/columns/{backlog['id']}/cards", json={"title": "First again"})
    assert response.status_code == 201
    board_final = client.get("/board").json()
    assert board_final["columns"][0]["cardIds"] == [response.json()["id"]]


def test_create_card_accepts_a_very_long_title_and_details(client):
    board = client.get("/board").json()
    column_id = board["columns"][0]["id"]
    long_title = "A" * 2000
    long_details = "B" * 20000

    response = client.post(
        f"/columns/{column_id}/cards", json={"title": long_title, "details": long_details}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == long_title
    assert body["details"] == long_details

    board_after = client.get("/board").json()
    assert board_after["cards"][body["id"]]["title"] == long_title


def test_rename_column_to_a_duplicate_name_is_allowed(client):
    board = client.get("/board").json()
    todo_id = board["columns"][1]["id"]
    done_title = board["columns"][4]["title"]

    response = client.patch(f"/columns/{todo_id}", json={"title": done_title})

    assert response.status_code == 200
    board_after = client.get("/board").json()
    assert board_after["columns"][1]["title"] == done_title
    assert board_after["columns"][4]["title"] == done_title


def test_board_exposes_configured_thresholds(client):
    board = client.get("/board").json()

    assert board["staleCardDays"] == STALE_CARD_DAYS
    assert board["columnCardLimit"] == COLUMN_CARD_LIMIT
    assert board["bottlenecks"] == []


def test_fresh_card_is_not_stale(client):
    board = client.get("/board").json()
    card_id = next(iter(board["cards"]))

    assert board["cards"][card_id]["isStale"] is False


def test_card_older_than_threshold_is_flagged_stale_and_listed_as_a_bottleneck(
    client, session
):
    board = client.get("/board").json()
    card_id = next(iter(board["cards"]))
    column_id = board["columns"][0]["id"]

    card = session.get(Card, card_id)
    card.status_changed_at = datetime.utcnow() - timedelta(days=STALE_CARD_DAYS + 1)
    session.add(card)
    session.commit()

    board_after = client.get("/board").json()

    assert board_after["cards"][card_id]["isStale"] is True
    stale_entries = [
        b
        for b in board_after["bottlenecks"]
        if b["type"] == "stale_card" and b["cardId"] == card_id
    ]
    assert len(stale_entries) == 1
    assert stale_entries[0]["columnId"] == column_id


def test_column_over_limit_is_flagged_overloaded_and_listed_as_a_bottleneck(client):
    board = client.get("/board").json()
    column_id = board["columns"][0]["id"]

    starting_count = len(board["columns"][0]["cardIds"])
    for i in range(COLUMN_CARD_LIMIT - starting_count + 1):
        response = client.post(f"/columns/{column_id}/cards", json={"title": f"Extra {i}"})
        assert response.status_code == 201

    board_after = client.get("/board").json()
    backlog = board_after["columns"][0]

    assert backlog["isOverloaded"] is True
    overloaded_entries = [
        b
        for b in board_after["bottlenecks"]
        if b["type"] == "overloaded_column" and b["columnId"] == column_id
    ]
    assert len(overloaded_entries) == 1


def test_moving_a_stale_card_to_another_column_clears_its_staleness(client, session):
    board = client.get("/board").json()
    card_id = board["columns"][0]["cardIds"][0]
    done_id = board["columns"][4]["id"]

    card = session.get(Card, card_id)
    card.status_changed_at = datetime.utcnow() - timedelta(days=STALE_CARD_DAYS + 1)
    session.add(card)
    session.commit()

    response = client.post(f"/cards/{card_id}/move", json={"toColumnId": done_id, "toIndex": 0})

    assert response.status_code == 200
    assert response.json()["isStale"] is False


def test_bottleneck_advice_maps_a_missing_api_key_to_502(client, monkeypatch):
    def raise_error(bottleneck_messages):
        raise AIConfigurationError("ANTHROPIC_API_KEY is not configured.")

    monkeypatch.setattr(routes, "generate_bottleneck_advice", raise_error)

    response = client.post("/bottlenecks/advice")

    assert response.status_code == 502
    assert "ANTHROPIC_API_KEY" in response.json()["detail"]


def test_bottleneck_advice_maps_an_anthropic_error_to_502(client, monkeypatch):
    def raise_error(bottleneck_messages):
        raise anthropic.AnthropicError("no api key configured")

    monkeypatch.setattr(routes, "generate_bottleneck_advice", raise_error)

    response = client.post("/bottlenecks/advice")

    assert response.status_code == 502


def test_bottleneck_advice_returns_the_model_reply(client, monkeypatch):
    monkeypatch.setattr(routes, "generate_bottleneck_advice", lambda bottleneck_messages: "Looks healthy.")

    response = client.post("/bottlenecks/advice")

    assert response.status_code == 200
    assert response.json() == {"advice": "Looks healthy."}


def test_bottleneck_advice_is_given_the_current_bottleneck_messages(client, session, monkeypatch):
    board = client.get("/board").json()
    card_id = board["columns"][0]["cardIds"][0]

    card = session.get(Card, card_id)
    card.status_changed_at = datetime.utcnow() - timedelta(days=STALE_CARD_DAYS + 1)
    session.add(card)
    session.commit()

    received = {}

    def fake_advice(bottleneck_messages):
        received["messages"] = bottleneck_messages
        return "Advice"

    monkeypatch.setattr(routes, "generate_bottleneck_advice", fake_advice)

    response = client.post("/bottlenecks/advice")

    assert response.status_code == 200
    assert len(received["messages"]) == 1
    assert "days" in received["messages"][0]


def test_reordering_within_the_same_column_does_not_reset_staleness(client, session):
    board = client.get("/board").json()
    backlog_id = board["columns"][0]["id"]
    first_card, second_card = board["columns"][0]["cardIds"]

    stale_since = datetime.utcnow() - timedelta(days=STALE_CARD_DAYS + 1)
    card = session.get(Card, first_card)
    card.status_changed_at = stale_since
    session.add(card)
    session.commit()

    response = client.post(
        f"/cards/{first_card}/move", json={"toColumnId": backlog_id, "toIndex": 1}
    )

    assert response.status_code == 200
    assert response.json()["isStale"] is True
