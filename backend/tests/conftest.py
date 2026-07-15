import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.db import get_session
from app.main import app
from app.seed import DEMO_PASSWORD, DEMO_USERNAME, seed_if_empty


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        seed_if_empty(session)
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    app.dependency_overrides[get_session] = lambda: session
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="auth_headers")
def auth_headers_fixture(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/auth/login", json={"username": DEMO_USERNAME, "password": DEMO_PASSWORD}
    )
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(name="board_id")
def board_id_fixture(client: TestClient, auth_headers: dict[str, str]) -> int:
    boards = client.get("/boards", headers=auth_headers).json()
    return boards[0]["id"]


def register_and_login(client: TestClient, username: str, password: str = "password123") -> dict[str, str]:
    client.post("/auth/register", json={"username": username, "password": password})
    response = client.post("/auth/login", json={"username": username, "password": password})
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}
