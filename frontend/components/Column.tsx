"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Board, Column as ColumnType, Priority } from "@/lib/types";
import { isCardStale, isColumnOverloaded } from "@/lib/alerts";
import { AddCardForm } from "./AddCardForm";
import { EditableColumnTitle } from "./EditableColumnTitle";
import { KanbanCard } from "./KanbanCard";

type ColumnProps = {
  column: ColumnType;
  visibleCardIds: string[];
  cards: Board["cards"];
  staleCardDays: number;
  columnCardLimit: number;
  onRename: (title: string) => void;
  onAddCard: (
    title: string,
    details: string,
    priority: Priority,
    dueDate: string | null
  ) => void;
  onDeleteCard: (cardId: string) => void;
  onCardPriorityChange: (cardId: string, priority: Priority) => void;
  onCardDueDateChange: (cardId: string, dueDate: string | null) => void;
};

export function Column({
  column,
  visibleCardIds,
  cards,
  staleCardDays,
  columnCardLimit,
  onRename,
  onAddCard,
  onDeleteCard,
  onCardPriorityChange,
  onCardDueDateChange,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const overloaded = isColumnOverloaded(column.cardIds.length, columnCardLimit);

  return (
    <section
      className={`kanban-column ${isOver ? "kanban-column-over" : ""}`}
      data-testid={`column-${column.id}`}
    >
      <header className="kanban-column-header">
        <EditableColumnTitle title={column.title} onRename={onRename} />
        {overloaded ? (
          <span
            className="kanban-column-overloaded"
            role="img"
            aria-label={`${column.title} is overloaded`}
            title={`Overloaded: more than ${columnCardLimit} cards`}
          >
            ⚠
          </span>
        ) : null}
        <span className="kanban-column-count">{visibleCardIds.length}</span>
      </header>

      <div ref={setNodeRef} className="kanban-column-body">
        <SortableContext
          items={visibleCardIds}
          strategy={verticalListSortingStrategy}
        >
          {visibleCardIds.map((cardId) => {
            const card = cards[cardId];
            if (!card) {
              return null;
            }

            return (
              <KanbanCard
                key={card.id}
                card={card}
                isStale={isCardStale(card.statusChangedAt, staleCardDays)}
                onDelete={() => onDeleteCard(card.id)}
                onPriorityChange={(priority) => onCardPriorityChange(card.id, priority)}
                onDueDateChange={(dueDate) => onCardDueDateChange(card.id, dueDate)}
              />
            );
          })}
        </SortableContext>
      </div>

      <footer className="kanban-column-footer">
        <AddCardForm onAdd={onAddCard} />
      </footer>
    </section>
  );
}
