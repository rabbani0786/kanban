"use client";

import { useState, useRef, useEffect } from "react";

type EditableColumnTitleProps = {
  title: string;
  onRename: (title: string) => void;
};

export function EditableColumnTitle({
  title,
  onRename,
}: EditableColumnTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(title);
  }, [title]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onRename(trimmed);
    } else {
      setValue(title);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="column-title-input"
        value={value}
        aria-label="Column title"
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
          }
          if (event.key === "Escape") {
            setValue(title);
            setIsEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className="column-title-button"
      aria-label={`Rename column ${title}`}
      onClick={() => setIsEditing(true)}
    >
      {title}
    </button>
  );
}
