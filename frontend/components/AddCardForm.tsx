"use client";

import { FormEvent, useState } from "react";

type AddCardFormProps = {
  onAdd: (title: string, details: string) => void;
};

export function AddCardForm({ onAdd }: AddCardFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  const reset = () => {
    setTitle("");
    setDetails("");
    setIsOpen(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    onAdd(trimmedTitle, details.trim());
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
