import { describe, expect, it } from "vitest";
import { computeBottlenecks, isCardStale, isColumnOverloaded } from "./alerts";
import type { Board } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("isCardStale", () => {
  it("is not stale just under the threshold", () => {
    const now = Date.now();
    const statusChangedAt = new Date(now - 5 * DAY_MS + 1000).toISOString();

    expect(isCardStale(statusChangedAt, 5, now)).toBe(false);
  });

  it("is stale exactly at the threshold", () => {
    const now = Date.now();
    const statusChangedAt = new Date(now - 5 * DAY_MS).toISOString();

    expect(isCardStale(statusChangedAt, 5, now)).toBe(true);
  });

  it("is stale past the threshold", () => {
    const now = Date.now();
    const statusChangedAt = new Date(now - 6 * DAY_MS).toISOString();

    expect(isCardStale(statusChangedAt, 5, now)).toBe(true);
  });
});

describe("isColumnOverloaded", () => {
  it("is not overloaded at the limit", () => {
    expect(isColumnOverloaded(6, 6)).toBe(false);
  });

  it("is overloaded over the limit", () => {
    expect(isColumnOverloaded(7, 6)).toBe(true);
  });
});

describe("computeBottlenecks", () => {
  function buildBoard(overrides: Partial<Board> = {}): Board {
    return {
      columns: [{ id: "col-1", title: "Backlog", cardIds: ["card-1"] }],
      cards: {
        "card-1": {
          id: "card-1",
          title: "Old task",
          details: "",
          statusChangedAt: new Date(Date.now() - 6 * DAY_MS).toISOString(),
        },
      },
      bottlenecks: [],
      staleCardDays: 5,
      columnCardLimit: 6,
      ...overrides,
    };
  }

  it("flags a stale card", () => {
    const bottlenecks = computeBottlenecks(buildBoard());

    expect(bottlenecks).toEqual([
      {
        type: "stale_card",
        columnId: "col-1",
        columnTitle: "Backlog",
        cardId: "card-1",
        cardTitle: "Old task",
        message: '"Old task" has been in "Backlog" for 6 days.',
      },
    ]);
  });

  it("flags an overloaded column", () => {
    const board = buildBoard({
      columns: [
        {
          id: "col-1",
          title: "Backlog",
          cardIds: ["c1", "c2", "c3", "c4", "c5", "c6", "c7"],
        },
      ],
      cards: {},
    });

    const bottlenecks = computeBottlenecks(board);

    expect(bottlenecks).toEqual([
      {
        type: "overloaded_column",
        columnId: "col-1",
        columnTitle: "Backlog",
        cardId: null,
        cardTitle: null,
        message: '"Backlog" has 7 cards (limit 6).',
      },
    ]);
  });

  it("returns no bottlenecks for a healthy board", () => {
    const board = buildBoard({
      cards: {
        "card-1": {
          id: "card-1",
          title: "Fresh task",
          details: "",
          statusChangedAt: new Date().toISOString(),
        },
      },
    });

    expect(computeBottlenecks(board)).toEqual([]);
  });
});
