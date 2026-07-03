import { describe, expect, it } from "vitest";
import { boardReducer } from "./boardReducer";
import { initialBoard } from "./initialData";
import type { Board } from "./types";

describe("boardReducer", () => {
  it("renames a column", () => {
    const next = boardReducer(initialBoard, {
      type: "RENAME_COLUMN",
      columnId: "col-todo",
      title: "Ready",
    });

    expect(
      next.columns.find((column) => column.id === "col-todo")?.title
    ).toBe("Ready");
  });

  it("keeps original title when rename is empty", () => {
    const next = boardReducer(initialBoard, {
      type: "RENAME_COLUMN",
      columnId: "col-todo",
      title: "   ",
    });

    expect(
      next.columns.find((column) => column.id === "col-todo")?.title
    ).toBe("To Do");
  });

  it("adds a card to a column", () => {
    const card = {
      id: "card-new",
      title: "New task",
      details: "Details here",
    };

    const next = boardReducer(initialBoard, {
      type: "ADD_CARD",
      columnId: "col-backlog",
      card,
    });

    expect(next.cards["card-new"]).toEqual(card);
    expect(
      next.columns.find((column) => column.id === "col-backlog")?.cardIds
    ).toContain("card-new");
  });

  it("deletes a card from board state", () => {
    const next = boardReducer(initialBoard, {
      type: "DELETE_CARD",
      columnId: "col-backlog",
      cardId: "card-1",
    });

    expect(next.cards["card-1"]).toBeUndefined();
    expect(
      next.columns.find((column) => column.id === "col-backlog")?.cardIds
    ).not.toContain("card-1");
  });

  it("moves a card to another column", () => {
    const next = boardReducer(initialBoard, {
      type: "MOVE_CARD",
      cardId: "card-3",
      fromColumnId: "col-todo",
      toColumnId: "col-in-progress",
      toIndex: 1,
    });

    expect(
      next.columns.find((column) => column.id === "col-todo")?.cardIds
    ).not.toContain("card-3");
    expect(
      next.columns.find((column) => column.id === "col-in-progress")?.cardIds
    ).toEqual(["card-5", "card-3", "card-6"]);
  });

  it("reorders a card within the same column", () => {
    const next = boardReducer(initialBoard, {
      type: "MOVE_CARD",
      cardId: "card-3",
      fromColumnId: "col-todo",
      toColumnId: "col-todo",
      toIndex: 1,
    });

    expect(
      next.columns.find((column) => column.id === "col-todo")?.cardIds
    ).toEqual(["card-4", "card-3"]);
  });

  it("moves a card into an empty column", () => {
    const emptyColumnBoard: Board = {
      columns: initialBoard.columns.map((column) =>
        column.id === "col-done" ? { ...column, cardIds: [] } : column
      ),
      cards: initialBoard.cards,
    };

    const next = boardReducer(emptyColumnBoard, {
      type: "MOVE_CARD",
      cardId: "card-1",
      fromColumnId: "col-backlog",
      toColumnId: "col-done",
      toIndex: 0,
    });

    expect(
      next.columns.find((column) => column.id === "col-done")?.cardIds
    ).toEqual(["card-1"]);
  });
});
