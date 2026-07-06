import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "@/components/ChatPanel";

describe("ChatPanel", () => {
  it("shows an empty-state hint before any messages are sent", () => {
    render(<ChatPanel onSend={vi.fn()} />);

    expect(screen.getByText(/Ask me to create, edit, or move cards/)).toBeInTheDocument();
  });

  it("sends the typed message and shows the reply", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue("Added the card to Backlog.");

    render(<ChatPanel onSend={onSend} />);

    await user.type(screen.getByLabelText("Chat message"), "Add a card called Ship it");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).toHaveBeenCalledWith("Add a card called Ship it");
    expect(await screen.findByText("Added the card to Backlog.")).toBeInTheDocument();
    expect(screen.getByText("Add a card called Ship it")).toBeInTheDocument();
  });

  it("clears the input after sending", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue("Done.");

    render(<ChatPanel onSend={onSend} />);

    const input = screen.getByLabelText("Chat message") as HTMLInputElement;
    await user.type(input, "hello");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByText("Done.");
    expect(input.value).toBe("");
  });

  it("does not send a blank message", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(<ChatPanel onSend={onSend} />);

    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows an error when the assistant call fails", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockRejectedValue(new Error("boom"));

    render(<ChatPanel onSend={onSend} />);

    await user.type(screen.getByLabelText("Chat message"), "hello");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The assistant could not process that. Please try again."
    );
  });
});
