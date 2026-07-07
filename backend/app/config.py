import os

STALE_CARD_DAYS = float(os.environ.get("STALE_CARD_DAYS", "5"))
COLUMN_CARD_LIMIT = int(os.environ.get("COLUMN_CARD_LIMIT", "6"))
