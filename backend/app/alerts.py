from datetime import datetime, timedelta

from app.config import COLUMN_CARD_LIMIT, STALE_CARD_DAYS


def is_card_stale(
    status_changed_at: datetime,
    now: datetime,
    threshold_days: float = STALE_CARD_DAYS,
) -> bool:
    # Calendar days (24h * threshold), weekends and holidays included.
    # Business-day/holiday-aware counting is a planned v2 improvement.
    return now - status_changed_at >= timedelta(days=threshold_days)


def is_column_overloaded(card_count: int, threshold: int = COLUMN_CARD_LIMIT) -> bool:
    return card_count > threshold
