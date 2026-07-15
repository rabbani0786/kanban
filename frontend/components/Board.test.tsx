import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { Board } from "@/components/Board";
import { initialBoard } from "@/lib/initialData";
import * as api from "@/lib/api";

type CapturedHandlers = {
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
};

const state = vi.hoisted(() => ({ handlers: null as CapturedHandlers | null }));

vi.mock("@dnd-kit/core", async () => {
  const actual = await vi.importActual<typeof import("@dnd-kit/core")>("@dnd-kit/core");
  return {
    ...actual,
    DndContext: ({
      children,
      onDragStart,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragStart: (event: DragStartEvent) => void;
      onDragEnd: (event: DragEndEvent) => void;
    }) => {
      state.handlers = { onDragStart, onDragEnd };
      return <>{children}</>;
    },
    DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock("@/lib/api");

const handlers = new Proxy({} as CapturedHandlers, {
  get(_target, prop: keyof CapturedHandlers) {
    if (!state.handlers) {
      throw new Error("DndContext has not rendered yet");
    }
    return state.handlers[prop];
  },
});

function dragEvent(activeId: string, overId: string | null) {
  return {
    active: { id: activeId },
    over: overId ? { id: overId } : null,
  } as unknown as DragEndEvent;
}

async function renderLoadedBoard() {
  vi.mocked(api.fetchBoard).mockResolvedValue(structuredClone(initialBoard));
  render(<Board boardId={1} />);
  await screen.findByTestId("column-col-backlog");
}

afterEach(() => {
  vi.mocked(api.fetchBoard).mockReset();
  vi.mocked(api.renameColumn).mockReset();
  vi.mocked(api.createCard).mockReset();
  vi.mocked(api.deleteCard).mockReset();
  vi.mocked(api.moveCard).mockReset();
  vi.mocked(api.sendChatMessage).mockReset();
  vi.mocked(api.updateCard).mockReset();
});

describe("Board loading", () => {
  it("shows a loading state before the board resolves", () => {
    vi.mocked(api.fetchBoard).mockReturnValue(new Promise(() => {}));

    render(<Board boardId={1} />);

    expect(screen.getByText("Loading board…")).toBeInTheDocument();
  });

  it("fetches the board for the given boardId", async () => {
    await renderLoadedBoard();

    expect(api.fetchBoard).toHaveBeenCalledWith(1);
  });

  it("renders all five columns once the board loads", async () => {
    await renderLoadedBoard();

    expect(screen.getByTestId("column-col-todo")).toBeInTheDocument();
    expect(screen.getByTestId("column-col-in-progress")).toBeInTheDocument();
    expect(screen.getByTestId("column-col-review")).toBeInTheDocument();
    expect(screen.getByTestId("column-col-done")).toBeInTheDocument();
    expect(screen.getByText("Research competitors")).toBeInTheDocument();
  });

  it("shows an error when the board fails to load", async () => {
    vi.mocked(api.fetchBoard).mockRejectedValue(new Error("network down"));

    render(<Board boardId={1} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load the board. Is the backend running?"
    );
  });
});

describe("Renaming a column", () => {
  it("renames a column when the API call succeeds", async () => {
    const user = userEvent.setup();
    vi.mocked(api.renameColumn).mockResolvedValue({
      id: "col-todo",
      title: "Ready",
      cardIds: ["card-3", "card-4"],
    });
    await renderLoadedBoard();

    await user.click(screen.getByRole("button", { name: "Rename column To Do" }));
    const input = screen.getByLabelText("Column title");
    await user.clear(input);
    await user.type(input, "Ready{Enter}");

    expect(api.renameColumn).toHaveBeenCalledWith(1, "col-todo", "Ready");
    expect(screen.getByRole("button", { name: "Rename column Ready" })).toBeInTheDocument();
  });

  it("shows an error and keeps the old title when the API call fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.renameColumn).mockRejectedValue(new Error("boom"));
    await renderLoadedBoard();

    await user.click(screen.getByRole("button", { name: "Rename column To Do" }));
    const input = screen.getByLabelText("Column title");
    await user.clear(input);
    await user.type(input, "Ready{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not rename the column. Please try again."
    );
    expect(screen.getByRole("button", { name: "Rename column To Do" })).toBeInTheDocument();
  });
});

describe("Adding a card", () => {
  it("adds the card returned by the API", async () => {
    const user = userEvent.setup();
    vi.mocked(api.createCard).mockResolvedValue({
      id: "card-new",
      title: "New task",
      details: "",
      priority: "medium",
      dueDate: null,
      statusChangedAt: new Date().toISOString(),
    });
    await renderLoadedBoard();

    const backlog = screen.getByTestId("column-col-backlog");
    await user.click(within(backlog).getByRole("button", { name: "+ Add card" }));
    await user.type(within(backlog).getByLabelText("Card title"), "New task");
    await user.click(within(backlog).getByRole("button", { name: "Add card" }));

    expect(api.createCard).toHaveBeenCalledWith(1, "col-backlog", "New task", "", "medium", null);
    expect(within(backlog).getByText("New task")).toBeInTheDocument();
  });

  it("shows an error and does not add a card when the API call fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.createCard).mockRejectedValue(new Error("boom"));
    await renderLoadedBoard();

    const backlog = screen.getByTestId("column-col-backlog");
    await user.click(within(backlog).getByRole("button", { name: "+ Add card" }));
    await user.type(within(backlog).getByLabelText("Card title"), "New task");
    await user.click(within(backlog).getByRole("button", { name: "Add card" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not add the card. Please try again."
    );
    expect(within(backlog).queryByText("New task")).not.toBeInTheDocument();
  });
});

describe("Deleting a card", () => {
  it("removes the card when the API call succeeds", async () => {
    const user = userEvent.setup();
    vi.mocked(api.deleteCard).mockResolvedValue(undefined);
    await renderLoadedBoard();

    await user.click(screen.getByRole("button", { name: "Delete card Research competitors" }));

    expect(api.deleteCard).toHaveBeenCalledWith(1, "card-1");
    expect(screen.queryByText("Research competitors")).not.toBeInTheDocument();
  });

  it("shows an error and keeps the card when the API call fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.deleteCard).mockRejectedValue(new Error("boom"));
    await renderLoadedBoard();

    await user.click(screen.getByRole("button", { name: "Delete card Research competitors" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not delete the card. Please try again."
    );
    expect(screen.getByText("Research competitors")).toBeInTheDocument();
  });
});

describe("Editing a card's priority and due date", () => {
  it("updates the priority when the API call succeeds", async () => {
    const user = userEvent.setup();
    vi.mocked(api.updateCard).mockResolvedValue({
      ...initialBoard.cards["card-1"],
      priority: "high",
    });
    await renderLoadedBoard();

    await user.selectOptions(
      screen.getByLabelText("Priority for Research competitors"),
      "high"
    );

    expect(api.updateCard).toHaveBeenCalledWith(1, "card-1", { priority: "high" });
  });

  it("shows an error when updating the priority fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.updateCard).mockRejectedValue(new Error("boom"));
    await renderLoadedBoard();

    await user.selectOptions(
      screen.getByLabelText("Priority for Research competitors"),
      "high"
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not update the card's priority. Please try again."
    );
  });

  it("sets a due date when the API call succeeds", async () => {
    const user = userEvent.setup();
    vi.mocked(api.updateCard).mockResolvedValue({
      ...initialBoard.cards["card-1"],
      dueDate: "2026-08-01T00:00:00.000Z",
    });
    await renderLoadedBoard();

    await user.type(screen.getByLabelText("Set due date for Research competitors"), "2026-08-01");

    expect(api.updateCard).toHaveBeenCalledWith(1, "card-1", {
      dueDate: "2026-08-01",
      clearDueDate: false,
    });
  });
});

describe("Filtering cards", () => {
  it("hides non-matching cards when searching", async () => {
    const user = userEvent.setup();
    await renderLoadedBoard();

    await user.type(screen.getByLabelText("Search cards"), "Research");

    expect(screen.getByText("Research competitors")).toBeInTheDocument();
    expect(screen.queryByText("Define color palette")).not.toBeInTheDocument();
  });

  it("filters cards by priority", async () => {
    const user = userEvent.setup();
    const highPriorityBoard = structuredClone(initialBoard);
    highPriorityBoard.cards["card-1"].priority = "high";
    vi.mocked(api.fetchBoard).mockResolvedValue(highPriorityBoard);
    render(<Board boardId={1} />);
    await screen.findByTestId("column-col-backlog");

    await user.selectOptions(screen.getByLabelText("Filter by priority"), "high");

    expect(screen.getByText("Research competitors")).toBeInTheDocument();
    expect(screen.queryByText("Define color palette")).not.toBeInTheDocument();
  });

  it("shows a note that drag-and-drop is disabled while filtering", async () => {
    const user = userEvent.setup();
    await renderLoadedBoard();

    await user.type(screen.getByLabelText("Search cards"), "Research");

    expect(
      screen.getByText("Drag-and-drop is disabled while filtering.")
    ).toBeInTheDocument();
  });
});

describe("Dragging a card", () => {
  it("shows a drag preview when a drag starts", async () => {
    await renderLoadedBoard();

    act(() => {
      handlers.onDragStart({ active: { id: "card-1" } } as unknown as DragStartEvent);
    });

    expect(screen.getAllByText("Research competitors")).toHaveLength(2);
  });

  it("ignores a drag end with no drop target", async () => {
    await renderLoadedBoard();

    await act(async () => {
      await handlers.onDragEnd(dragEvent("card-1", null));
    });

    expect(api.moveCard).not.toHaveBeenCalled();
  });

  it("ignores a drag end for a card that is not on the board", async () => {
    await renderLoadedBoard();

    await act(async () => {
      await handlers.onDragEnd(dragEvent("does-not-exist", "col-todo"));
    });

    expect(api.moveCard).not.toHaveBeenCalled();
  });

  it("ignores a drag end dropped on an unknown target", async () => {
    await renderLoadedBoard();

    await act(async () => {
      await handlers.onDragEnd(dragEvent("card-1", "does-not-exist"));
    });

    expect(api.moveCard).not.toHaveBeenCalled();
  });

  it("is a no-op when dropped back in the same slot", async () => {
    await renderLoadedBoard();

    await act(async () => {
      await handlers.onDragEnd(dragEvent("card-1", "card-1"));
    });

    expect(api.moveCard).not.toHaveBeenCalled();
  });

  it("moves the card when the API call succeeds", async () => {
    vi.mocked(api.moveCard).mockResolvedValue({
      id: "card-1",
      title: "Research competitors",
      details: "Review top 5 Kanban apps and note UX patterns.",
      priority: "medium",
      dueDate: null,
      statusChangedAt: new Date().toISOString(),
    });
    await renderLoadedBoard();

    await act(async () => {
      await handlers.onDragEnd(dragEvent("card-1", "col-done"));
    });

    expect(api.moveCard).toHaveBeenCalledWith(1, "card-1", "col-done", 2);
    await waitFor(() => {
      expect(
        within(screen.getByTestId("column-col-done")).getByText("Research competitors")
      ).toBeInTheDocument();
    });
    expect(
      within(screen.getByTestId("column-col-backlog")).queryByText("Research competitors")
    ).not.toBeInTheDocument();
  });

  it("shows an error and leaves the card in place when the API call fails", async () => {
    vi.mocked(api.moveCard).mockRejectedValue(new Error("boom"));
    await renderLoadedBoard();

    await act(async () => {
      await handlers.onDragEnd(dragEvent("card-1", "col-done"));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not move the card. Please try again."
    );
    expect(
      within(screen.getByTestId("column-col-backlog")).getByText("Research competitors")
    ).toBeInTheDocument();
  });
});

describe("AI chat", () => {
  it("renders the chat panel alongside the board", async () => {
    await renderLoadedBoard();

    expect(screen.getByRole("heading", { name: "AI Assistant" })).toBeInTheDocument();
    expect(screen.getByLabelText("Chat message")).toBeInTheDocument();
  });

  it("sends a chat message scoped to the board and refreshes with the AI's changes", async () => {
    const user = userEvent.setup();
    await renderLoadedBoard();

    const updatedBoard = structuredClone(initialBoard);
    updatedBoard.cards["card-new"] = {
      id: "card-new",
      title: "Added by AI",
      details: "",
      priority: "medium",
      dueDate: null,
      statusChangedAt: new Date().toISOString(),
    };
    updatedBoard.columns[0].cardIds.push("card-new");

    vi.mocked(api.sendChatMessage).mockResolvedValue({ reply: "Added the card." });
    vi.mocked(api.fetchBoard).mockResolvedValue(updatedBoard);

    await user.type(screen.getByLabelText("Chat message"), "Add a card called Added by AI");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(api.sendChatMessage).toHaveBeenCalledWith(1, "Add a card called Added by AI");
    expect(await screen.findByText("Added the card.")).toBeInTheDocument();
    expect(await screen.findByText("Added by AI")).toBeInTheDocument();
  });
});
