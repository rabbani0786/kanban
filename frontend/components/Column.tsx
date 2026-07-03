"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Board, Column as ColumnType } from "@/lib/types";
import { AddCardForm } from "./AddCardForm";
import { EditableColumnTitle } from "./EditableColumnTitle";
import { KanbanCard } from "./KanbanCard";

type ColumnProps = {
  column: ColumnType;
  cards: Board["cards"];
  onRename: (title: string) => void;
  onAddCard: (title: string, details: string) => void;
  onDeleteCard: (cardId: string) => void;
};

export function Column({
  column,
  cards,
  onRename,
  onAddCard,
  onDeleteCard,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      className={`kanban-column ${isOver ? "kanban-column-over" : ""}`}
      data-testid={`column-${column.id}`}
    >
      <header className="kanban-column-header">
        <EditableColumnTitle title={column.title} onRename={onRename} />
        <span className="kanban-column-count">{column.cardIds.length}</span>
      </header>

      <div ref={setNodeRef} className="kanban-column-body">
        <SortableContext
          items={column.cardIds}
          strategy={verticalListSortingStrategy}
        >
          {column.cardIds.map((cardId) => {
            const card = cards[cardId];
            if (!card) {
              return null;
            }

            return (
              <KanbanCard
                key={card.id}
                card={card}
                onDelete={() => onDeleteCard(card.id)}
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
