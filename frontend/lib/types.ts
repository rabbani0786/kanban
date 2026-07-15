export type Priority = "low" | "medium" | "high";

export type Card = {
  id: string;
  title: string;
  details: string;
  priority: Priority;
  dueDate: string | null;
  statusChangedAt: string;
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
};

export type Bottleneck = {
  type: "stale_card" | "overloaded_column";
  columnId: string;
  columnTitle: string;
  cardId: string | null;
  cardTitle: string | null;
  message: string;
};

export type Board = {
  id: number;
  name: string;
  columns: Column[];
  cards: Record<string, Card>;
  bottlenecks: Bottleneck[];
  staleCardDays: number;
  columnCardLimit: number;
};

export type BoardSummary = {
  id: number;
  name: string;
  createdAt: string;
};

export type BoardAction =
  | { type: "RENAME_COLUMN"; columnId: string; title: string }
  | { type: "ADD_CARD"; columnId: string; card: Card }
  | { type: "UPDATE_CARD"; card: Card }
  | { type: "DELETE_CARD"; columnId: string; cardId: string }
  | {
      type: "MOVE_CARD";
      cardId: string;
      card: Card;
      fromColumnId: string;
      toColumnId: string;
      toIndex: number;
    };
