import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardSwitcher } from "@/components/BoardSwitcher";
import type { BoardSummary } from "@/lib/types";

const boards: BoardSummary[] = [
  { id: 1, name: "My Board", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: 2, name: "Marketing", createdAt: "2026-01-02T00:00:00.000Z" },
];

function renderSwitcher(overrides: Partial<React.ComponentProps<typeof BoardSwitcher>> = {}) {
  const onSelect = vi.fn();
  const onCreate = vi.fn();
  const onRename = vi.fn();
  const onDelete = vi.fn();

  render(
    <BoardSwitcher
      boards={boards}
      activeBoardId={1}
      onSelect={onSelect}
      onCreate={onCreate}
      onRename={onRename}
      onDelete={onDelete}
      {...overrides}
    />
  );

  return { onSelect, onCreate, onRename, onDelete };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BoardSwitcher", () => {
  it("renders a tab for each board", () => {
    renderSwitcher();

    expect(screen.getByRole("button", { name: "My Board" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marketing" })).toBeInTheDocument();
  });

  it("selects a board when its tab is clicked", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderSwitcher();

    await user.click(screen.getByRole("button", { name: "Marketing" }));

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("only shows rename/delete controls for the active board", () => {
    renderSwitcher();

    expect(screen.getByLabelText("Rename board My Board")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete board My Board")).toBeInTheDocument();
    expect(screen.queryByLabelText("Rename board Marketing")).not.toBeInTheDocument();
  });

  it("creates a new board", async () => {
    const user = userEvent.setup();
    const { onCreate } = renderSwitcher();

    await user.click(screen.getByRole("button", { name: "+ New board" }));
    await user.type(screen.getByLabelText("New board name"), "Sprint 2");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onCreate).toHaveBeenCalledWith("Sprint 2");
  });

  it("cancels creating a new board", async () => {
    const user = userEvent.setup();
    renderSwitcher();

    await user.click(screen.getByRole("button", { name: "+ New board" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "+ New board" })).toBeInTheDocument();
  });

  it("renames the active board", async () => {
    const user = userEvent.setup();
    const { onRename } = renderSwitcher();

    await user.click(screen.getByLabelText("Rename board My Board"));
    const input = screen.getByLabelText("Board name");
    await user.clear(input);
    await user.type(input, "Renamed{Enter}");

    expect(onRename).toHaveBeenCalledWith(1, "Renamed");
  });

  it("deletes the active board after confirming", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onDelete } = renderSwitcher();

    await user.click(screen.getByLabelText("Delete board My Board"));

    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("does not delete the board when the confirmation is dismissed", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { onDelete } = renderSwitcher();

    await user.click(screen.getByLabelText("Delete board My Board"));

    expect(onDelete).not.toHaveBeenCalled();
  });
});
