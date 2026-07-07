"use client";

import { useState } from "react";
import { getBottleneckAdvice } from "@/lib/api";

export function AdviceButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [advice, setAdvice] = useState("");
  const [error, setError] = useState("");

  const handleClick = async () => {
    setIsOpen(true);
    setIsLoading(true);
    setError("");
    try {
      const { advice } = await getBottleneckAdvice();
      setAdvice(advice);
    } catch {
      setError("Could not get AI advice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="advice-button-wrapper">
      <button
        type="button"
        className="advice-button"
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? "Thinking…" : "Get AI advice"}
      </button>

      {isOpen ? (
        <div className="advice-popover" role="status">
          <button
            type="button"
            className="advice-popover-close"
            aria-label="Close advice"
            onClick={() => setIsOpen(false)}
          >
            ×
          </button>
          {error ? (
            <p role="alert" className="advice-popover-error">
              {error}
            </p>
          ) : isLoading ? (
            <p className="advice-popover-loading">Thinking…</p>
          ) : (
            <p className="advice-popover-text">{advice}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
