"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "@/lib/types";

type KanbanCardProps = {
  card: Card;
  onDelete: () => void;
};

export function KanbanCard({ card, onDelete }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`kanban-card ${isDragging ? "kanban-card-dragging" : ""}`}
      data-testid={`card-${card.id}`}
    >
      <div className="kanban-card-header">
        <button
          type="button"
          className="kanban-card-drag-handle"
          aria-label={`Drag card ${card.title}`}
          {...attributes}
          {...listeners}
        >
          <span aria-hidden="true">::</span>
        </button>
        <h3 className="kanban-card-title">{card.title}</h3>
        <button
          type="button"
          className="kanban-card-delete"
          aria-label={`Delete card ${card.title}`}
          onClick={onDelete}
        >
          x
        </button>
      </div>
      {card.details ? (
        <p className="kanban-card-details">{card.details}</p>
      ) : null}
    </article>
  );
}
