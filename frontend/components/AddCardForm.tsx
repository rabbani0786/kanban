"use client";

import { FormEvent, useState } from "react";
import type { Priority } from "@/lib/types";

type AddCardFormProps = {
  onAdd: (title: string, details: string, priority: Priority, dueDate: string | null) => void;
};

export function AddCardForm({ onAdd }: AddCardFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");

  const reset = () => {
    setTitle("");
    setDetails("");
    setPriority("medium");
    setDueDate("");
    setIsOpen(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    onAdd(trimmedTitle, details.trim(), priority, dueDate || null);
    reset();
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className="add-card-trigger"
        onClick={() => setIsOpen(true)}
      >
        + Add card
      </button>
    );
  }

  return (
    <form className="add-card-form" onSubmit={handleSubmit}>
      <input
        className="add-card-input"
        placeholder="Card title"
        value={title}
        aria-label="Card title"
        onChange={(event) => setTitle(event.target.value)}
        autoFocus
      />
      <textarea
        className="add-card-textarea"
        placeholder="Details (optional)"
        value={details}
        aria-label="Card details"
        rows={3}
        onChange={(event) => setDetails(event.target.value)}
      />
      <div className="add-card-row">
        <select
          className="add-card-priority"
          value={priority}
          aria-label="Card priority"
          onChange={(event) => setPriority(event.target.value as Priority)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input
          className="add-card-due-date"
          type="date"
          value={dueDate}
          aria-label="Due date"
          onChange={(event) => setDueDate(event.target.value)}
        />
      </div>
      <div className="add-card-actions">
        <button type="submit" className="add-card-submit">
          Add card
        </button>
        <button type="button" className="add-card-cancel" onClick={reset}>
          Cancel
        </button>
      </div>
    </form>
  );
}
