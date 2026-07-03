export type Card = {
  id: string;
  title: string;
  details: string;
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
};

export type Board = {
  columns: Column[];
  cards: Record<string, Card>;
};

export type BoardAction =
  | { type: "RENAME_COLUMN"; columnId: string; title: string }
  | { type: "ADD_CARD"; columnId: string; card: Card }
  | { type: "DELETE_CARD"; columnId: string; cardId: string }
  | {
      type: "MOVE_CARD";
      cardId: string;
      fromColumnId: string;
      toColumnId: string;
      toIndex: number;
    };

export const COLUMN_IDS = [
  "col-backlog",
  "col-todo",
  "col-in-progress",
  "col-review",
  "col-done",
] as const;
