import hashlib
import hmac
import secrets

from fastapi import Depends, Header, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import AuthToken, User

PBKDF2_ITERATIONS = 260_000


class AuthError(Exception):
    pass


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    if "$" not in stored:
        return False
    salt, expected_hex = stored.split("$", 1)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return hmac.compare_digest(digest.hex(), expected_hex)


def register_user(session: Session, username: str, password: str) -> User:
    username = username.strip()
    existing = session.exec(select(User).where(User.username == username)).first()
    if existing is not None:
        raise AuthError("username is already taken")

    user = User(username=username, password_hash=hash_password(password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def authenticate_user(session: Session, username: str, password: str) -> User:
    user = session.exec(select(User).where(User.username == username.strip())).first()
    if user is None or not verify_password(password, user.password_hash):
        raise AuthError("invalid username or password")
    return user


def create_session_token(session: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    session.add(AuthToken(token=token, user_id=user.id))
    session.commit()
    return token


def invalidate_session_token(session: Session, token: str) -> None:
    auth_token = session.exec(select(AuthToken).where(AuthToken.token == token)).first()
    if auth_token is not None:
        session.delete(auth_token)
        session.commit()


def get_current_user(
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing or invalid Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    auth_token = session.exec(select(AuthToken).where(AuthToken.token == token)).first()
    if auth_token is None:
        raise HTTPException(status_code=401, detail="invalid or expired session")

    user = session.get(User, auth_token.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="invalid or expired session")
    return user
