"use client";

import { useState } from "react";
import type { Bottleneck } from "@/lib/types";

type BottlenecksPanelProps = {
  bottlenecks: Bottleneck[];
  onGetAdvice: () => Promise<string>;
};

export function BottlenecksPanel({ bottlenecks, onGetAdvice }: BottlenecksPanelProps) {
  const [advice, setAdvice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGetAdvice = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await onGetAdvice();
      setAdvice(result);
    } catch {
      setError("Could not get AI advice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bottlenecks-panel" aria-label="Bottleneck alerts">
      <div className="bottlenecks-panel-header">
        <h2 className="bottlenecks-panel-title">Bottlenecks</h2>
        {bottlenecks.length > 0 ? (
          <button
            type="button"
            className="bottlenecks-panel-advice-button"
            onClick={handleGetAdvice}
            disabled={isLoading}
          >
            {isLoading ? "Thinking…" : "Get AI advice"}
          </button>
        ) : null}
      </div>

      {bottlenecks.length === 0 ? (
        <p className="bottlenecks-panel-empty">No bottlenecks right now.</p>
      ) : (
        <ul className="bottlenecks-panel-list">
          {bottlenecks.map((bottleneck) => (
            <li
              key={`${bottleneck.type}-${bottleneck.columnId}-${bottleneck.cardId ?? ""}`}
              className={`bottlenecks-panel-item bottlenecks-panel-item-${bottleneck.type}`}
            >
              {bottleneck.message}
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p role="alert" className="bottlenecks-panel-error">
          {error}
        </p>
      ) : null}

      {advice ? <p className="bottlenecks-panel-advice">{advice}</p> : null}
    </section>
  );
}
