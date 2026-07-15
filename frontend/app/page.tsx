"use client";

import { useEffect, useState } from "react";
import { AdviceButton } from "@/components/AdviceButton";
import { Board } from "@/components/Board";
import { BoardSwitcher } from "@/components/BoardSwitcher";
import { LoginForm } from "@/components/LoginForm";
import { clearSession, hasStoredSession, logout } from "@/lib/auth";
import { createBoard, deleteBoard, fetchBoards, renameBoard } from "@/lib/api";
import type { BoardSummary } from "@/lib/types";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
  const [boardsError, setBoardsError] = useState("");

  useEffect(() => {
    setIsAuthenticated(hasStoredSession());
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    fetchBoards()
      .then((fetched) => {
        setBoards(fetched);
        setActiveBoardId((current) =>
          current && fetched.some((b) => b.id === current) ? current : (fetched[0]?.id ?? null)
        );
        setBoardsError("");
      })
      .catch(() => setBoardsError("Could not load your boards. Is the backend running?"));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginForm onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>
            Project <span className="app-header-accent">Board</span>
          </h1>
          <p className="app-header-subtitle">Drag cards between columns to track progress.</p>
        </div>
        <div className="app-header-actions">
          {activeBoardId !== null ? <AdviceButton boardId={activeBoardId} /> : null}
          <button
            type="button"
            className="logout-button"
            onClick={async () => {
              try {
                await logout();
              } finally {
                clearSession();
                setIsAuthenticated(false);
                setBoards([]);
                setActiveBoardId(null);
              }
            }}
          >
            Log out
          </button>
        </div>
      </header>

      {boardsError ? (
        <p role="alert" className="board-error">
          {boardsError}
        </p>
      ) : null}

      {boards.length > 0 && activeBoardId !== null ? (
        <BoardSwitcher
          boards={boards}
          activeBoardId={activeBoardId}
          onSelect={setActiveBoardId}
          onCreate={async (name) => {
            const board = await createBoard(name);
            setBoards((current) => [...current, board]);
            setActiveBoardId(board.id);
          }}
          onRename={async (boardId, name) => {
            const updated = await renameBoard(boardId, name);
            setBoards((current) =>
              current.map((b) => (b.id === updated.id ? updated : b))
            );
          }}
          onDelete={async (boardId) => {
            await deleteBoard(boardId);
            setBoards((current) => {
              const remaining = current.filter((b) => b.id !== boardId);
              setActiveBoardId((currentActive) =>
                currentActive === boardId ? (remaining[0]?.id ?? null) : currentActive
              );
              return remaining;
            });
          }}
        />
      ) : null}

      {activeBoardId !== null ? <Board key={activeBoardId} boardId={activeBoardId} /> : null}
    </main>
  );
}
