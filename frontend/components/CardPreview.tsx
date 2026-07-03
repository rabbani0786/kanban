import type { Card } from "@/lib/types";

type CardPreviewProps = {
  card: Card;
};

export function CardPreview({ card }: CardPreviewProps) {
  return (
    <article className="kanban-card kanban-card-dragging">
      <div className="kanban-card-header">
        <span className="kanban-card-drag-handle" aria-hidden="true">
          ::
        </span>
        <h3 className="kanban-card-title">{card.title}</h3>
      </div>
      {card.details ? (
        <p className="kanban-card-details">{card.details}</p>
      ) : null}
    </article>
  );
}
