"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card, Priority } from "@/lib/types";

type KanbanCardProps = {
  card: Card;
  isStale?: boolean;
  onDelete: () => void;
  onPriorityChange: (priority: Priority) => void;
  onDueDateChange: (dueDate: string | null) => void;
};

function formatDueDate(dueDate: string): string {
  return new Date(dueDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function KanbanCard({
  card,
  isStale = false,
  onDelete,
  onPriorityChange,
  onDueDateChange,
}: KanbanCardProps) {
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
      className={`kanban-card ${isDragging ? "kanban-card-dragging" : ""} ${
        isStale ? "kanban-card-stale" : ""
      }`}
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
        {isStale ? (
          <span
            className="kanban-card-stale-badge"
            role="img"
            aria-label={`${card.title} is stale`}
            title="This card has been in this column for a while"
          >
            🕒
          </span>
        ) : null}
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
      <div className="kanban-card-footer">
        <select
          className={`kanban-card-priority kanban-card-priority-${card.priority}`}
          value={card.priority}
          aria-label={`Priority for ${card.title}`}
          onChange={(event) => onPriorityChange(event.target.value as Priority)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        {card.dueDate ? (
          <span className="kanban-card-due-date">
            Due {formatDueDate(card.dueDate)}
            <button
              type="button"
              className="kanban-card-due-date-clear"
              aria-label={`Clear due date for ${card.title}`}
              onClick={() => onDueDateChange(null)}
            >
              ×
            </button>
          </span>
        ) : (
          <input
            type="date"
            className="kanban-card-due-date-input"
            aria-label={`Set due date for ${card.title}`}
            value=""
            onChange={(event) => onDueDateChange(event.target.value || null)}
          />
        )}
      </div>
    </article>
  );
}
