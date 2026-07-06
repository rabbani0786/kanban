"use client";

import { useEffect, useState } from "react";
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
          <p>Drag cards between columns to track progress.</p>
        </div>
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
      </header>
      <Board />
    </main>
  );
}
