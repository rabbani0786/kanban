import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanCard } from "@/components/KanbanCard";
import type { Card } from "@/lib/types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    title: "Ship MVP",
    details: "Launch it",
    priority: "medium",
    dueDate: null,
    statusChangedAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderCard(overrides: Partial<Card> = {}, props: Partial<React.ComponentProps<typeof KanbanCard>> = {}) {
  const onDelete = vi.fn();
  const onPriorityChange = vi.fn();
  const onDueDateChange = vi.fn();

  render(
    <KanbanCard
      card={makeCard(overrides)}
      onDelete={onDelete}
      onPriorityChange={onPriorityChange}
      onDueDateChange={onDueDateChange}
      {...props}
    />
  );

  return { onDelete, onPriorityChange, onDueDateChange };
}

describe("KanbanCard", () => {
  it("renders the title and details", () => {
    renderCard();

    expect(screen.getByText("Ship MVP")).toBeInTheDocument();
    expect(screen.getByText("Launch it")).toBeInTheDocument();
  });

  it("omits the details paragraph when details are empty", () => {
    renderCard({ details: "" });

    expect(screen.queryByText("Launch it")).not.toBeInTheDocument();
  });

  it("does not show a stale badge by default", () => {
    renderCard();

    expect(screen.queryByLabelText("Ship MVP is stale")).not.toBeInTheDocument();
  });

  it("shows a stale badge when isStale is true", () => {
    renderCard({}, { isStale: true });

    expect(screen.getByLabelText("Ship MVP is stale")).toBeInTheDocument();
  });

  it("calls onDelete when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderCard();

    await user.click(screen.getByRole("button", { name: "Delete card Ship MVP" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("shows the current priority", () => {
    renderCard({ priority: "high" });

    expect(screen.getByLabelText("Priority for Ship MVP")).toHaveValue("high");
  });

  it("calls onPriorityChange when the priority select changes", async () => {
    const user = userEvent.setup();
    const { onPriorityChange } = renderCard();

    await user.selectOptions(screen.getByLabelText("Priority for Ship MVP"), "low");

    expect(onPriorityChange).toHaveBeenCalledWith("low");
  });

  it("shows a due date input when there is no due date yet", () => {
    renderCard({ dueDate: null });

    expect(screen.getByLabelText("Set due date for Ship MVP")).toBeInTheDocument();
  });

  it("calls onDueDateChange when a due date is set", async () => {
    const user = userEvent.setup();
    const { onDueDateChange } = renderCard({ dueDate: null });

    await user.type(screen.getByLabelText("Set due date for Ship MVP"), "2026-08-01");

    expect(onDueDateChange).toHaveBeenCalledWith("2026-08-01");
  });

  it("shows the formatted due date when one is set", () => {
    renderCard({ dueDate: "2026-08-01T00:00:00.000Z" });

    expect(screen.getByText(/Due/)).toBeInTheDocument();
  });

  it("calls onDueDateChange with null when the due date is cleared", async () => {
    const user = userEvent.setup();
    const { onDueDateChange } = renderCard({ dueDate: "2026-08-01T00:00:00.000Z" });

    await user.click(screen.getByLabelText("Clear due date for Ship MVP"));

    expect(onDueDateChange).toHaveBeenCalledWith(null);
  });
});
