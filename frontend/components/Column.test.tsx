import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext } from "@dnd-kit/core";
import { Column } from "@/components/Column";
import type { Board } from "@/lib/types";

const cards: Board["cards"] = {
  "card-1": { id: "card-1", title: "First", details: "" },
  "card-2": { id: "card-2", title: "Second", details: "" },
};

const column = { id: "col-todo", title: "To Do", cardIds: ["card-1", "card-2"] };

function renderColumn(overrides: Partial<React.ComponentProps<typeof Column>> = {}) {
  const onRename = vi.fn();
  const onAddCard = vi.fn();
  const onDeleteCard = vi.fn();

  render(
    <DndContext>
      <Column
        column={column}
        cards={cards}
        onRename={onRename}
        onAddCard={onAddCard}
        onDeleteCard={onDeleteCard}
        {...overrides}
      />
    </DndContext>
  );

  return { onRename, onAddCard, onDeleteCard };
}

describe("Column", () => {
  it("renders the title, card count, and cards", () => {
    renderColumn();

    expect(screen.getByRole("button", { name: "Rename column To Do" })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("skips card ids that have no matching card", () => {
    render(
      <DndContext>
        <Column
          column={{ id: "col-todo", title: "To Do", cardIds: ["card-1", "missing"] }}
          cards={cards}
          onRename={vi.fn()}
          onAddCard={vi.fn()}
          onDeleteCard={vi.fn()}
        />
      </DndContext>
    );

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

    expect(onAddCard).toHaveBeenCalledWith("Third", "");
  });
});
