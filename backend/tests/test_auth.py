from app.seed import DEMO_PASSWORD, DEMO_USERNAME


def test_register_creates_a_user_with_a_default_board(client):
    response = client.post(
        "/auth/register", json={"username": "alice", "password": "password123"}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["username"] == "alice"
    assert body["token"]

    boards = client.get("/boards", headers={"Authorization": f"Bearer {body['token']}"}).json()
    assert len(boards) == 1
    assert boards[0]["name"] == "My Board"


def test_register_rejects_a_duplicate_username(client):
    client.post("/auth/register", json={"username": "bob", "password": "password123"})

    response = client.post("/auth/register", json={"username": "bob", "password": "password123"})

    assert response.status_code == 409


def test_register_rejects_a_blank_username(client):
    response = client.post("/auth/register", json={"username": "   ", "password": "password123"})

    assert response.status_code == 422


def test_register_rejects_a_short_password(client):
    response = client.post("/auth/register", json={"username": "carol", "password": "short"})

    assert response.status_code == 422


def test_login_with_correct_credentials_returns_a_token(client):
    response = client.post(
        "/auth/login", json={"username": DEMO_USERNAME, "password": DEMO_PASSWORD}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == DEMO_USERNAME
    assert body["token"]


def test_login_with_wrong_password_is_rejected(client):
    response = client.post(
        "/auth/login", json={"username": DEMO_USERNAME, "password": "wrong-password"}
    )

    assert response.status_code == 401


def test_login_with_unknown_username_is_rejected(client):
    response = client.post(
        "/auth/login", json={"username": "does-not-exist", "password": "whatever"}
    )

    assert response.status_code == 401


def test_me_returns_the_current_user(client, auth_headers):
    response = client.get("/auth/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["username"] == DEMO_USERNAME


def test_me_requires_authentication(client):
    response = client.get("/auth/me")

    assert response.status_code == 401


def test_me_rejects_an_unknown_token(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})

    assert response.status_code == 401


def test_logout_invalidates_the_token(client, auth_headers):
    client.post("/auth/logout", headers=auth_headers)

    response = client.get("/auth/me", headers=auth_headers)

    assert response.status_code == 401


def test_logout_without_a_token_is_a_no_op(client):
    response = client.post("/auth/logout")

    assert response.status_code == 204
