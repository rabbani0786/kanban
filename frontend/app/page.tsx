"use client";

import { Board } from "@/components/Board";

export default function Home() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>
          Project <span className="app-header-accent">Board</span>
        </h1>
        <p>Drag cards between columns to track progress.</p>
      </header>
      <Board />
    </main>
  );
}
