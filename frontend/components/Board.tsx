"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { boardReducer } from "@/lib/boardReducer";
import {
  createCard,
  deleteCard,
  fetchBoard,
  moveCard,
  renameColumn,
  sendChatMessage,
} from "@/lib/api";
import type { Board as BoardType, Card } from "@/lib/types";
import { Column } from "./Column";
import { CardPreview } from "./CardPreview";
import { ChatPanel } from "./ChatPanel";

function findColumnIdByCardId(
  columns: BoardType["columns"],
  cardId: string
): string | undefined {
  return columns.find((column) => column.cardIds.includes(cardId))?.id;
}

export function Board() {
  const [board, setBoard] = useState<BoardType | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const lastOverIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetchBoard()
      .then(setBoard)
      .catch(() => setLoadError("Could not load the board. Is the backend running?"));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Each card registers as its own droppable (via useSortable) alongside each column's
  // droppable, so a plain distance-based strategy like closestCorners measures against
  // every card on the whole board — it can lock onto a card in the wrong column, or find
  // no match at all for a frame right as the pointer is released. Mirrors dnd-kit's own
  // "multiple containers" example: prefer whatever droppable the pointer is literally
  // inside, fall back to rect intersection, and keep the last good target so a single
  // gap frame at drop time doesn't silently cancel the move.
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args);
      let overId = getFirstCollision(intersections, "id");

      if (overId != null && board) {
        const overColumn = board.columns.find((column) => column.id === overId);
        if (overColumn && overColumn.cardIds.length > 0) {
          // Pointer is over the column body, not a specific card — refine to whichever
          // card in that column is closest, so the insertion index feels precise.
          const closestMatch = getFirstCollision(
            closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter((container) =>
                overColumn.cardIds.includes(container.id as string)
              ),
            }),
            "id"
          );
          if (closestMatch != null) {
            overId = closestMatch;
          }
        }
      }

      if (overId != null) {
        lastOverIdRef.current = String(overId);
        return [{ id: overId }];
      }

      return lastOverIdRef.current ? [{ id: lastOverIdRef.current }] : [];
    },
    [board]
  );

  const handleDragStart = (event: DragStartEvent) => {
    lastOverIdRef.current = null;
    if (!board) {
      return;
    }
    const card = board.cards[event.active.id as string];
    setActiveCard(card ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    if (!board) {
      return;
    }

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

    const targetColumn = board.columns.find((column) => column.id === toColumnId);
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

    try {
      const movedCard = await moveCard(cardId, toColumnId, toIndex);
      setBoard((current) =>
        current
          ? boardReducer(current, {
              type: "MOVE_CARD",
              cardId,
              card: movedCard,
              fromColumnId,
              toColumnId,
              toIndex,
            })
          : current
      );
      setActionError("");
    } catch {
      setActionError("Could not move the card. Please try again.");
    }
  };

  const handleChatSend = async (message: string): Promise<string> => {
    const { reply } = await sendChatMessage(message);
    try {
      setBoard(await fetchBoard());
    } catch {
      // The chat reply already succeeded; leave the board as-is if the refresh fails.
    }
    return reply;
  };

  return (
    <div className="board-layout">
      <div className="board-main">
        {loadError ? (
          <p role="alert" className="board-error">
            {loadError}
          </p>
        ) : !board ? (
          <p className="board-loading">Loading board…</p>
        ) : (
          <DndContext
            id="kanban-board"
            sensors={sensors}
            collisionDetection={collisionDetectionStrategy}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {actionError ? (
              <p role="alert" className="board-action-error">
                {actionError}
              </p>
            ) : null}

            <div className="kanban-board">
              {board.columns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  cards={board.cards}
                  staleCardDays={board.staleCardDays}
                  columnCardLimit={board.columnCardLimit}
                  onRename={async (title) => {
                    try {
                      await renameColumn(column.id, title);
                      setBoard((current) =>
                        current
                          ? boardReducer(current, {
                              type: "RENAME_COLUMN",
                              columnId: column.id,
                              title,
                            })
                          : current
                      );
                      setActionError("");
                    } catch {
                      setActionError("Could not rename the column. Please try again.");
                    }
                  }}
                  onAddCard={async (title, details) => {
                    try {
                      const card = await createCard(column.id, title, details);
                      setBoard((current) =>
                        current
                          ? boardReducer(current, {
                              type: "ADD_CARD",
                              columnId: column.id,
                              card,
                            })
                          : current
                      );
                      setActionError("");
                    } catch {
                      setActionError("Could not add the card. Please try again.");
                    }
                  }}
                  onDeleteCard={async (cardId) => {
                    try {
                      await deleteCard(cardId);
                      setBoard((current) =>
                        current
                          ? boardReducer(current, {
                              type: "DELETE_CARD",
                              columnId: column.id,
                              cardId,
                            })
                          : current
                      );
                      setActionError("");
                    } catch {
                      setActionError("Could not delete the card. Please try again.");
                    }
                  }}
                />
              ))}
            </div>

            <DragOverlay>
              {activeCard ? <CardPreview card={activeCard} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <ChatPanel onSend={handleChatSend} />
    </div>
  );
}
