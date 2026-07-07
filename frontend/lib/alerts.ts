import type { Board, Bottleneck } from "./types";

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

export function computeBottlenecks(board: Board, now: number = Date.now()): Bottleneck[] {
  const items: Bottleneck[] = [];

  for (const column of board.columns) {
    const cardCount = column.cardIds.length;
    if (isColumnOverloaded(cardCount, board.columnCardLimit)) {
      items.push({
        type: "overloaded_column",
        columnId: column.id,
        columnTitle: column.title,
        cardId: null,
        cardTitle: null,
        message: `"${column.title}" has ${cardCount} cards (limit ${board.columnCardLimit}).`,
      });
    }

    for (const cardId of column.cardIds) {
      const card = board.cards[cardId];
      if (!card || !isCardStale(card.statusChangedAt, board.staleCardDays, now)) {
        continue;
      }

      const days = Math.floor((now - new Date(card.statusChangedAt).getTime()) / DAY_MS);
      items.push({
        type: "stale_card",
        columnId: column.id,
        columnTitle: column.title,
        cardId: card.id,
        cardTitle: card.title,
        message: `"${card.title}" has been in "${column.title}" for ${days} days.`,
      });
    }
  }

  return items;
}
