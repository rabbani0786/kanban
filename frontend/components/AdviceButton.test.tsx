import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdviceButton } from "@/components/AdviceButton";
import * as api from "@/lib/api";

vi.mock("@/lib/api");

describe("AdviceButton", () => {
  it("does not show a popover before the button is clicked", () => {
    render(<AdviceButton boardId={1} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("fetches and shows advice for the given board when clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getBottleneckAdvice).mockResolvedValue({
      advice: "Prioritize Migrate DB today.",
    });

    render(<AdviceButton boardId={7} />);
    await user.click(screen.getByRole("button", { name: "Get AI advice" }));

    expect(await screen.findByText("Prioritize Migrate DB today.")).toBeInTheDocument();
    expect(api.getBottleneckAdvice).toHaveBeenCalledWith(7);
  });

  it("shows a loading state while the request is pending", async () => {
    const user = userEvent.setup();
    let resolveAdvice: (value: { advice: string }) => void = () => {};
    vi.mocked(api.getBottleneckAdvice).mockReturnValue(
      new Promise((resolve) => {
        resolveAdvice = resolve;
      })
    );

    render(<AdviceButton boardId={1} />);
    await user.click(screen.getByRole("button", { name: "Get AI advice" }));

    expect(screen.getByRole("button", { name: "Thinking…" })).toBeDisabled();

    resolveAdvice({ advice: "Done." });
    expect(await screen.findByText("Done.")).toBeInTheDocument();
  });

  it("shows an error when the request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getBottleneckAdvice).mockRejectedValue(new Error("boom"));

    render(<AdviceButton boardId={1} />);
    await user.click(screen.getByRole("button", { name: "Get AI advice" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not get AI advice. Please try again."
    );
  });

  it("closes the popover when the close button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getBottleneckAdvice).mockResolvedValue({ advice: "All good." });

    render(<AdviceButton boardId={1} />);
    await user.click(screen.getByRole("button", { name: "Get AI advice" }));
    await screen.findByText("All good.");

    await user.click(screen.getByRole("button", { name: "Close advice" }));

    expect(screen.queryByText("All good.")).not.toBeInTheDocument();
  });
});
