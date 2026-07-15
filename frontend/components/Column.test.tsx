import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext } from "@dnd-kit/core";
import { Column } from "@/components/Column";
import type { Board } from "@/lib/types";

const NOW = new Date().toISOString();

const cards: Board["cards"] = {
  "card-1": {
    id: "card-1",
    title: "First",
    details: "",
    priority: "medium",
    dueDate: null,
    statusChangedAt: NOW,
  },
  "card-2": {
    id: "card-2",
    title: "Second",
    details: "",
    priority: "medium",
    dueDate: null,
    statusChangedAt: NOW,
  },
};

const column = { id: "col-todo", title: "To Do", cardIds: ["card-1", "card-2"] };

function renderColumn(overrides: Partial<React.ComponentProps<typeof Column>> = {}) {
  const onRename = vi.fn();
  const onAddCard = vi.fn();
  const onDeleteCard = vi.fn();
  const onCardPriorityChange = vi.fn();
  const onCardDueDateChange = vi.fn();

  render(
    <DndContext>
      <Column
        column={column}
        visibleCardIds={column.cardIds}
        cards={cards}
        staleCardDays={5}
        columnCardLimit={6}
        onRename={onRename}
        onAddCard={onAddCard}
        onDeleteCard={onDeleteCard}
        onCardPriorityChange={onCardPriorityChange}
        onCardDueDateChange={onCardDueDateChange}
        {...overrides}
      />
    </DndContext>
  );

  return { onRename, onAddCard, onDeleteCard, onCardPriorityChange, onCardDueDateChange };
}

describe("Column", () => {
  it("renders the title, card count, and cards", () => {
    renderColumn();

    expect(screen.getByRole("button", { name: "Rename column To Do" })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("only renders the cards in visibleCardIds", () => {
    renderColumn({ visibleCardIds: ["card-1"] });

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.queryByText("Second")).not.toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("skips card ids that have no matching card", () => {
    renderColumn({
      column: { id: "col-todo", title: "To Do", cardIds: ["card-1", "missing"] },
      visibleCardIds: ["card-1", "missing"],
    });

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.queryByText("Second")).not.toBeInTheDocument();
  });

  it("forwards delete for the correct card", async () => {
    const user = userEvent.setup();
    const { onDeleteCard } = renderColumn();

    await user.click(screen.getByRole("button", { name: "Delete card Second" }));

    expect(onDeleteCard).toHaveBeenCalledWith("card-2");
  });

  it("forwards a rename", async () => {
    const user = userEvent.setup();
    const { onRename } = renderColumn();

    await user.click(screen.getByRole("button", { name: "Rename column To Do" }));
    const input = screen.getByLabelText("Column title");
    await user.clear(input);
    await user.type(input, "Ready{Enter}");

    expect(onRename).toHaveBeenCalledWith("Ready");
  });

  it("forwards a new card", async () => {
    const user = userEvent.setup();
    const { onAddCard } = renderColumn();

    await user.click(screen.getByRole("button", { name: "+ Add card" }));
    await user.type(screen.getByLabelText("Card title"), "Third");
    await user.click(screen.getByRole("button", { name: "Add card" }));

    expect(onAddCard).toHaveBeenCalledWith("Third", "", "medium", null);
  });

  it("forwards a card priority change with the card id", async () => {
    const user = userEvent.setup();
    const { onCardPriorityChange } = renderColumn();

    await user.selectOptions(screen.getByLabelText("Priority for Second"), "high");

    expect(onCardPriorityChange).toHaveBeenCalledWith("card-2", "high");
  });

  it("forwards a card due date change with the card id", async () => {
    const user = userEvent.setup();
    const { onCardDueDateChange } = renderColumn();

    await user.type(screen.getByLabelText("Set due date for Second"), "2026-08-01");

    expect(onCardDueDateChange).toHaveBeenCalledWith("card-2", "2026-08-01");
  });

  it("does not show an overloaded badge under the limit", () => {
    renderColumn({ columnCardLimit: 6 });

    expect(screen.queryByLabelText("To Do is overloaded")).not.toBeInTheDocument();
  });

  it("shows an overloaded badge once the card count exceeds the limit", () => {
    renderColumn({ columnCardLimit: 1 });

    expect(screen.getByLabelText("To Do is overloaded")).toBeInTheDocument();
  });

  it("marks a card as stale once it has aged past the threshold", () => {
    const staleCards: Board["cards"] = {
      "card-1": {
        id: "card-1",
        title: "First",
        details: "",
        priority: "medium",
        dueDate: null,
        statusChangedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
      "card-2": cards["card-2"],
    };

    renderColumn({ cards: staleCards, staleCardDays: 5 });

    expect(screen.getByLabelText("First is stale")).toBeInTheDocument();
    expect(screen.queryByLabelText("Second is stale")).not.toBeInTheDocument();
  });
});
