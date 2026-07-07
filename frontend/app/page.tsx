"use client";

import { useEffect, useState } from "react";
import { AdviceButton } from "@/components/AdviceButton";
import { Board } from "@/components/Board";
import { LoginForm } from "@/components/LoginForm";
import { clearSession, hasStoredSession, storeSession } from "@/lib/auth";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(hasStoredSession());
  }, []);

  if (!isAuthenticated) {
    return (
      <LoginForm
        onSuccess={() => {
          storeSession();
          setIsAuthenticated(true);
        }}
      />
    );
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
          <AdviceButton />
          <button
            type="button"
            className="logout-button"
            onClick={() => {
              clearSession();
              setIsAuthenticated(false);
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <Board />
    </main>
  );
}
