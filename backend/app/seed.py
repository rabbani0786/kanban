import os

from sqlmodel import Session, select

from app.auth import hash_password
from app.models import Board, Card, Column, User

DEMO_USERNAME = os.environ.get("DEMO_USERNAME", "user")
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "password")

COLUMN_TITLES = ["Backlog", "To Do", "In Progress", "Review", "Done"]

CARDS_BY_COLUMN = [
    [
        ("Customer login page redesign", "Refresh the sign-in flow with the new brand colors and layout."),
        ("Investigate slow dashboard load times", "Analytics dashboard load times spike past 4s at peak hours."),
    ],
    [
        ("Add dark mode toggle", "Add a user-level dark mode toggle, persisted across sessions."),
        ("Set up Stripe subscription webhooks", "Handle Stripe's created, updated, and cancelled events."),
    ],
    [
        ("Migrate user database to PostgreSQL", "Migrate off the legacy MySQL instance to PostgreSQL."),
        ("Build CSV export for reports", "Let admins export monthly usage reports as CSV."),
    ],
    [
        ("Mobile navigation menu", "Collapsible nav for screens under 768px, ready for review."),
        ("Rate limiting on public API", "Rate limit the public API to 100 requests per minute per key."),
    ],
    [
        ("Two-factor authentication rollout", "Shipped optional 2FA via authenticator app for all users."),
        ("Onboarding email sequence", "Launched the 5-part welcome email series for new signups."),
    ],
]


def seed_if_empty(session: Session) -> None:
    existing_user = session.exec(select(User).where(User.username == DEMO_USERNAME)).first()
    if existing_user is not None:
        if not existing_user.password_hash:
            existing_user.password_hash = hash_password(DEMO_PASSWORD)
            session.add(existing_user)
            session.commit()
        return

    user = User(username=DEMO_USERNAME, password_hash=hash_password(DEMO_PASSWORD))
    session.add(user)
    session.flush()

    board = Board(user_id=user.id, name="My Board")
    session.add(board)
    session.flush()

    for position, (title, cards) in enumerate(zip(COLUMN_TITLES, CARDS_BY_COLUMN)):
        column = Column(board_id=board.id, title=title, position=position)
        session.add(column)
        session.flush()

        for card_position, (card_title, details) in enumerate(cards):
            session.add(
                Card(
                    column_id=column.id,
                    title=card_title,
                    details=details,
                    position=card_position,
                )
            )

    session.commit()
