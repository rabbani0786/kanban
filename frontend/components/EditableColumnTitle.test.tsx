import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditableColumnTitle } from "@/components/EditableColumnTitle";

describe("EditableColumnTitle", () => {
  it("shows the title as a button initially", () => {
    render(<EditableColumnTitle title="To Do" onRename={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Rename column To Do" })).toBeInTheDocument();
  });

  it("commits a new title on Enter", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();

    render(<EditableColumnTitle title="To Do" onRename={onRename} />);

    await user.click(screen.getByRole("button", { name: "Rename column To Do" }));
    const input = screen.getByLabelText("Column title");
    await user.clear(input);
    await user.type(input, "Ready{Enter}");

    expect(onRename).toHaveBeenCalledWith("Ready");
    expect(screen.getByRole("button", { name: "Rename column To Do" })).toBeInTheDocument();
  });

  it("commits a new title on blur", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();

    render(
      <>
        <EditableColumnTitle title="To Do" onRename={onRename} />
        <button type="button">elsewhere</button>
      </>
    );

    await user.click(screen.getByRole("button", { name: "Rename column To Do" }));
    const input = screen.getByLabelText("Column title");
    await user.clear(input);
    await user.type(input, "Ready");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    expect(onRename).toHaveBeenCalledWith("Ready");
  });

  it("reverts to the original title on Escape without renaming", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();

    render(<EditableColumnTitle title="To Do" onRename={onRename} />);

    await user.click(screen.getByRole("button", { name: "Rename column To Do" }));
    const input = screen.getByLabelText("Column title");
    await user.clear(input);
    await user.type(input, "Ready{Escape}");

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Rename column To Do" })).toBeInTheDocument();
  });

  it("reverts to the original title when committed empty", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();

    render(<EditableColumnTitle title="To Do" onRename={onRename} />);

    await user.click(screen.getByRole("button", { name: "Rename column To Do" }));
    const input = screen.getByLabelText("Column title");
    await user.clear(input);
    await user.type(input, "   {Enter}");

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Rename column To Do" })).toBeInTheDocument();
  });
});
