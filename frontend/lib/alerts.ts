const DAY_MS = 24 * 60 * 60 * 1000;

export function isCardStale(
  statusChangedAt: string,
  thresholdDays: number,
  now: number = Date.now()
): boolean {
  return now - new Date(statusChangedAt).getTime() >= thresholdDays * DAY_MS;
}

export function isColumnOverloaded(cardCount: number, limit: number): boolean {
  return cardCount > limit;
}
