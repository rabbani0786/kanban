import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "@/components/FilterBar";

describe("FilterBar", () => {
  it("calls onSearchTextChange as the user types", async () => {
    const user = userEvent.setup();
    const onSearchTextChange = vi.fn();

    render(
      <FilterBar
        searchText=""
        onSearchTextChange={onSearchTextChange}
        priorityFilter="all"
        onPriorityFilterChange={vi.fn()}
        isFiltering={false}
      />
    );

    await user.type(screen.getByLabelText("Search cards"), "a");

    expect(onSearchTextChange).toHaveBeenCalledWith("a");
  });

  it("calls onPriorityFilterChange when a priority is selected", async () => {
    const user = userEvent.setup();
    const onPriorityFilterChange = vi.fn();

    render(
      <FilterBar
        searchText=""
        onSearchTextChange={vi.fn()}
        priorityFilter="all"
        onPriorityFilterChange={onPriorityFilterChange}
        isFiltering={false}
      />
    );

    await user.selectOptions(screen.getByLabelText("Filter by priority"), "high");

    expect(onPriorityFilterChange).toHaveBeenCalledWith("high");
  });

  it("shows the disabled drag-and-drop note only while filtering", () => {
    const { rerender } = render(
      <FilterBar
        searchText=""
        onSearchTextChange={vi.fn()}
        priorityFilter="all"
        onPriorityFilterChange={vi.fn()}
        isFiltering={false}
      />
    );

    expect(
      screen.queryByText("Drag-and-drop is disabled while filtering.")
    ).not.toBeInTheDocument();

    rerender(
      <FilterBar
        searchText="foo"
        onSearchTextChange={vi.fn()}
        priorityFilter="all"
        onPriorityFilterChange={vi.fn()}
        isFiltering
      />
    );

    expect(screen.getByText("Drag-and-drop is disabled while filtering.")).toBeInTheDocument();
  });
});
