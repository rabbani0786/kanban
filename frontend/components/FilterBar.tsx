"use client";

import type { Priority } from "@/lib/types";

type FilterBarProps = {
  searchText: string;
  onSearchTextChange: (value: string) => void;
  priorityFilter: Priority | "all";
  onPriorityFilterChange: (value: Priority | "all") => void;
  isFiltering: boolean;
};

export function FilterBar({
  searchText,
  onSearchTextChange,
  priorityFilter,
  onPriorityFilterChange,
  isFiltering,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      <input
        className="filter-bar-search"
        type="search"
        value={searchText}
        onChange={(event) => onSearchTextChange(event.target.value)}
        placeholder="Search cards…"
        aria-label="Search cards"
      />
      <select
        className="filter-bar-priority"
        value={priorityFilter}
        onChange={(event) => onPriorityFilterChange(event.target.value as Priority | "all")}
        aria-label="Filter by priority"
      >
        <option value="all">All priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      {isFiltering ? (
        <p className="filter-bar-note">Drag-and-drop is disabled while filtering.</p>
      ) : null}
    </div>
  );
}
