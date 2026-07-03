import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddCardForm } from "@/components/AddCardForm";

describe("AddCardForm", () => {
  it("submits a new card", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(<AddCardForm onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "+ Add card" }));
    await user.type(screen.getByLabelText("Card title"), "Ship MVP");
    await user.type(screen.getByLabelText("Card details"), "Launch the board");
    await user.click(screen.getByRole("button", { name: "Add card" }));

    expect(onAdd).toHaveBeenCalledWith("Ship MVP", "Launch the board");
  });
});
