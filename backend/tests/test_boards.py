from tests.conftest import register_and_login


def test_list_boards_returns_only_the_current_users_boards(client, auth_headers, board_id):
    response = client.get("/boards", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert [b["id"] for b in body] == [board_id]


def test_list_boards_requires_authentication(client):
    response = client.get("/boards")

    assert response.status_code == 401


def test_create_board_adds_default_columns(client, auth_headers):
    response = client.post("/boards", json={"name": "Marketing"}, headers=auth_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Marketing"

    board = client.get(f"/boards/{body['id']}", headers=auth_headers).json()
    assert [c["title"] for c in board["columns"]] == [
        "Backlog",
        "To Do",
        "In Progress",
        "Review",
        "Done",
    ]
    assert board["cards"] == {}


def test_create_board_defaults_name(client, auth_headers):
    response = client.post("/boards", json={}, headers=auth_headers)

    assert response.status_code == 201
    assert response.json()["name"] == "My Board"


def test_create_board_rejects_blank_name(client, auth_headers):
    response = client.post("/boards", json={"name": "   "}, headers=auth_headers)

    assert response.status_code == 422


def test_a_user_can_have_multiple_boards(client, auth_headers, board_id):
    client.post("/boards", json={"name": "Second board"}, headers=auth_headers)

    boards = client.get("/boards", headers=auth_headers).json()
    assert len(boards) == 2
    assert board_id in [b["id"] for b in boards]


def test_rename_board(client, auth_headers, board_id):
    response = client.patch(f"/boards/{board_id}", json={"name": "Renamed"}, headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["name"] == "Renamed"


def test_rename_board_rejects_blank_name(client, auth_headers, board_id):
    response = client.patch(f"/boards/{board_id}", json={"name": "  "}, headers=auth_headers)

    assert response.status_code == 422


def test_delete_board_removes_it_and_its_cards(client, auth_headers, board_id):
    response = client.delete(f"/boards/{board_id}", headers=auth_headers)

    assert response.status_code == 204

    boards = client.get("/boards", headers=auth_headers).json()
    assert boards == []

    get_response = client.get(f"/boards/{board_id}", headers=auth_headers)
    assert get_response.status_code == 404


def test_delete_board_404_for_unknown_board(client, auth_headers):
    response = client.delete("/boards/999999", headers=auth_headers)

    assert response.status_code == 404


def test_a_user_cannot_view_another_users_board(client, auth_headers, board_id):
    other_headers = register_and_login(client, "eve")

    response = client.get(f"/boards/{board_id}", headers=other_headers)

    assert response.status_code == 404


def test_a_user_cannot_rename_another_users_board(client, auth_headers, board_id):
    other_headers = register_and_login(client, "mallory")

    response = client.patch(
        f"/boards/{board_id}", json={"name": "Hijacked"}, headers=other_headers
    )

    assert response.status_code == 404


def test_a_user_cannot_delete_another_users_board(client, auth_headers, board_id):
    other_headers = register_and_login(client, "trent")

    response = client.delete(f"/boards/{board_id}", headers=other_headers)

    assert response.status_code == 404
    assert client.get(f"/boards/{board_id}", headers=auth_headers).status_code == 200


def test_a_user_cannot_add_a_card_to_another_users_board(client, auth_headers, board_id):
    other_headers = register_and_login(client, "oscar")
    board = client.get(f"/boards/{board_id}", headers=auth_headers).json()
    column_id = board["columns"][0]["id"]

    response = client.post(
        f"/boards/{board_id}/columns/{column_id}/cards",
        json={"title": "Sneaky"},
        headers=other_headers,
    )

    assert response.status_code == 404


def test_a_user_cannot_delete_a_card_on_another_users_board(client, auth_headers, board_id):
    other_headers = register_and_login(client, "victor")
    board = client.get(f"/boards/{board_id}", headers=auth_headers).json()
    card_id = next(iter(board["cards"]))

    response = client.delete(f"/boards/{board_id}/cards/{card_id}", headers=other_headers)

    assert response.status_code == 404
    assert card_id in client.get(f"/boards/{board_id}", headers=auth_headers).json()["cards"]
