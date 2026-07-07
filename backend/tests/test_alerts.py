from datetime import datetime, timedelta

from app.alerts import is_card_stale, is_column_overloaded


def test_card_under_threshold_is_not_stale():
    now = datetime(2026, 1, 10)
    status_changed_at = now - timedelta(days=5) + timedelta(seconds=1)

    assert is_card_stale(status_changed_at, now, threshold_days=5) is False


def test_card_exactly_at_threshold_is_stale():
    now = datetime(2026, 1, 10)
    status_changed_at = now - timedelta(days=5)

    assert is_card_stale(status_changed_at, now, threshold_days=5) is True


def test_card_over_threshold_is_stale():
    now = datetime(2026, 1, 10)
    status_changed_at = now - timedelta(days=6)

    assert is_card_stale(status_changed_at, now, threshold_days=5) is True


def test_column_at_limit_is_not_overloaded():
    assert is_column_overloaded(6, threshold=6) is False


def test_column_over_limit_is_overloaded():
    assert is_column_overloaded(7, threshold=6) is True


def test_column_under_limit_is_not_overloaded():
    assert is_column_overloaded(5, threshold=6) is False
