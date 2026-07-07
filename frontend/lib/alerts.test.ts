import { describe, expect, it } from "vitest";
import { isCardStale, isColumnOverloaded } from "./alerts";

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
