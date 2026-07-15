import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddCardForm } from "@/components/AddCardForm";

describe("AddCardForm", () => {
  it("submits a new card with default priority and no due date", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(<AddCardForm onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "+ Add card" }));
    await user.type(screen.getByLabelText("Card title"), "Ship MVP");
    await user.type(screen.getByLabelText("Card details"), "Launch the board");
    await user.click(screen.getByRole("button", { name: "Add card" }));

    expect(onAdd).toHaveBeenCalledWith("Ship MVP", "Launch the board", "medium", null);
  });

  it("submits a card with a chosen priority and due date", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(<AddCardForm onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "+ Add card" }));
    await user.type(screen.getByLabelText("Card title"), "Urgent fix");
    await user.selectOptions(screen.getByLabelText("Card priority"), "high");
    await user.type(screen.getByLabelText("Due date"), "2026-08-01");
    await user.click(screen.getByRole("button", { name: "Add card" }));

    expect(onAdd).toHaveBeenCalledWith("Urgent fix", "", "high", "2026-08-01");
  });

  it("does not submit when the title is blank", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(<AddCardForm onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "+ Add card" }));
    await user.click(screen.getByRole("button", { name: "Add card" }));

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("resets the form when cancelled", async () => {
    const user = userEvent.setup();

    render(<AddCardForm onAdd={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "+ Add card" }));
    await user.type(screen.getByLabelText("Card title"), "Draft");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "+ Add card" })).toBeInTheDocument();
  });
});
