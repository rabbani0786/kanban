"use client";

import { useReducer, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { boardReducer } from "@/lib/boardReducer";
import { initialBoard } from "@/lib/initialData";
import type { Card } from "@/lib/types";
import { Column } from "./Column";
import { CardPreview } from "./CardPreview";

function findColumnIdByCardId(
  columns: typeof initialBoard.columns,
  cardId: string
): string | undefined {
  return columns.find((column) => column.cardIds.includes(cardId))?.id;
}

export function Board() {
  const [board, dispatch] = useReducer(boardReducer, initialBoard);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const card = board.cards[event.active.id as string];
    setActiveCard(card ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);

    const { active, over } = event;
    if (!over) {
      return;
    }

    const cardId = active.id as string;
    const fromColumnId = findColumnIdByCardId(board.columns, cardId);
    if (!fromColumnId) {
      return;
    }

    const overId = over.id as string;
    const toColumnId =
      board.columns.find((column) => column.id === overId)?.id ??
      findColumnIdByCardId(board.columns, overId);

    if (!toColumnId) {
      return;
    }

    const targetColumn = board.columns.find(
      (column) => column.id === toColumnId
    );
    if (!targetColumn) {
      return;
    }

    let toIndex = targetColumn.cardIds.length;

    if (targetColumn.cardIds.includes(overId)) {
      toIndex = targetColumn.cardIds.indexOf(overId);
    }

    if (fromColumnId === toColumnId) {
      const fromIndex = targetColumn.cardIds.indexOf(cardId);
      if (fromIndex === toIndex) {
        return;
      }
    }

    dispatch({
      type: "MOVE_CARD",
      cardId,
      fromColumnId,
      toColumnId,
      toIndex,
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        {board.columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            cards={board.cards}
            onRename={(title) =>
              dispatch({ type: "RENAME_COLUMN", columnId: column.id, title })
            }
            onAddCard={(title, details) =>
              dispatch({
                type: "ADD_CARD",
                columnId: column.id,
                card: {
                  id: crypto.randomUUID(),
                  title,
                  details,
                },
              })
            }
            onDeleteCard={(cardId) =>
              dispatch({
                type: "DELETE_CARD",
                columnId: column.id,
                cardId,
              })
            }
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard ? <CardPreview card={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
