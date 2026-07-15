import type { Board, BoardAction } from "./types";

function arrayMove<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...array];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function removeCardFromColumn(
  columns: Board["columns"],
  columnId: string,
  cardId: string
): Board["columns"] {
  return columns.map((column) =>
    column.id === columnId
      ? { ...column, cardIds: column.cardIds.filter((id) => id !== cardId) }
      : column
  );
}

export function boardReducer(state: Board, action: BoardAction): Board {
  switch (action.type) {
    case "RENAME_COLUMN": {
      return {
        ...state,
        columns: state.columns.map((column) =>
          column.id === action.columnId
            ? { ...column, title: action.title.trim() || column.title }
            : column
        ),
      };
    }

    case "ADD_CARD": {
      return {
        ...state,
        cards: { ...state.cards, [action.card.id]: action.card },
        columns: state.columns.map((column) =>
          column.id === action.columnId
            ? { ...column, cardIds: [...column.cardIds, action.card.id] }
            : column
        ),
      };
    }

    case "UPDATE_CARD": {
      return {
        ...state,
        cards: { ...state.cards, [action.card.id]: action.card },
      };
    }

    case "DELETE_CARD": {
      const { [action.cardId]: _removed, ...remainingCards } = state.cards;
      return {
        ...state,
        cards: remainingCards,
        columns: removeCardFromColumn(
          state.columns,
          action.columnId,
          action.cardId
        ),
      };
    }

    case "MOVE_CARD": {
      const fromColumn = state.columns.find(
        (column) => column.id === action.fromColumnId
      );
      const toColumn = state.columns.find(
        (column) => column.id === action.toColumnId
      );

      if (!fromColumn || !toColumn) {
        return state;
      }

      const fromIndex = fromColumn.cardIds.indexOf(action.cardId);
      if (fromIndex === -1) {
        return state;
      }

      const cards = { ...state.cards, [action.cardId]: action.card };

      if (action.fromColumnId === action.toColumnId) {
        return {
          ...state,
          cards,
          columns: state.columns.map((column) =>
            column.id === action.fromColumnId
              ? {
                  ...column,
                  cardIds: arrayMove(
                    column.cardIds,
                    fromIndex,
                    action.toIndex
                  ),
                }
              : column
          ),
        };
      }

      const nextCardIds = [...toColumn.cardIds];
      const insertIndex = Math.max(
        0,
        Math.min(action.toIndex, nextCardIds.length)
      );
      nextCardIds.splice(insertIndex, 0, action.cardId);

      return {
        ...state,
        cards,
        columns: state.columns.map((column) => {
          if (column.id === action.fromColumnId) {
            return {
              ...column,
              cardIds: column.cardIds.filter((id) => id !== action.cardId),
            };
          }

          if (column.id === action.toColumnId) {
            return { ...column, cardIds: nextCardIds };
          }

          return column;
        }),
      };
    }

    default:
      return state;
  }
}
