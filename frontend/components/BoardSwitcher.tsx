"use client";

import { FormEvent, useState } from "react";
import type { BoardSummary } from "@/lib/types";

type BoardSwitcherProps = {
  boards: BoardSummary[];
  activeBoardId: number;
  onSelect: (boardId: number) => void;
  onCreate: (name: string) => void;
  onRename: (boardId: number, name: string) => void;
  onDelete: (boardId: number) => void;
};

export function BoardSwitcher({
  boards,
  activeBoardId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: BoardSwitcherProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreateSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = newBoardName.trim();
    if (!trimmed) {
      return;
    }
    onCreate(trimmed);
    setNewBoardName("");
    setIsCreating(false);
  };

  const startRenaming = (board: BoardSummary) => {
    setEditingBoardId(board.id);
    setEditName(board.name);
  };

  const handleRenameSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = editName.trim();
    if (trimmed && editingBoardId !== null) {
      onRename(editingBoardId, trimmed);
    }
    setEditingBoardId(null);
  };

  const handleDelete = (board: BoardSummary) => {
    if (window.confirm(`Delete board "${board.name}"? This cannot be undone.`)) {
      onDelete(board.id);
    }
  };

  return (
    <nav className="board-switcher" aria-label="Boards">
      <ul className="board-switcher-list">
        {boards.map((board) =>
          editingBoardId === board.id ? (
            <li key={board.id} className="board-switcher-item">
              <form className="board-switcher-rename-form" onSubmit={handleRenameSubmit}>
                <input
                  className="board-switcher-rename-input"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  aria-label="Board name"
                  autoFocus
                  onBlur={handleRenameSubmit}
                />
              </form>
            </li>
          ) : (
            <li key={board.id} className="board-switcher-item">
              <button
                type="button"
                className={`board-switcher-tab ${
                  board.id === activeBoardId ? "board-switcher-tab-active" : ""
                }`}
                onClick={() => onSelect(board.id)}
              >
                {board.name}
              </button>
              {board.id === activeBoardId ? (
                <span className="board-switcher-actions">
                  <button
                    type="button"
                    className="board-switcher-rename"
                    aria-label={`Rename board ${board.name}`}
                    onClick={() => startRenaming(board)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="board-switcher-delete"
                    aria-label={`Delete board ${board.name}`}
                    onClick={() => handleDelete(board)}
                  >
                    ×
                  </button>
                </span>
              ) : null}
            </li>
          )
        )}
      </ul>

      {isCreating ? (
        <form className="board-switcher-create-form" onSubmit={handleCreateSubmit}>
          <input
            className="board-switcher-create-input"
            value={newBoardName}
            onChange={(event) => setNewBoardName(event.target.value)}
            aria-label="New board name"
            placeholder="Board name"
            autoFocus
          />
          <button type="submit" className="board-switcher-create-submit">
            Create
          </button>
          <button
            type="button"
            className="board-switcher-create-cancel"
            onClick={() => {
              setIsCreating(false);
              setNewBoardName("");
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="board-switcher-new-trigger"
          onClick={() => setIsCreating(true)}
        >
          + New board
        </button>
      )}
    </nav>
  );
}
