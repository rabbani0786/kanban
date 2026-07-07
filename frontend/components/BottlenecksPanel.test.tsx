import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottlenecksPanel } from "@/components/BottlenecksPanel";
import type { Bottleneck } from "@/lib/types";

const bottlenecks: Bottleneck[] = [
  {
    type: "stale_card",
    columnId: "col-1",
    columnTitle: "In Progress",
    cardId: "card-1",
    cardTitle: "Migrate DB",
    message: '"Migrate DB" has been in "In Progress" for 6 days.',
  },
  {
    type: "overloaded_column",
    columnId: "col-2",
    columnTitle: "To Do",
    cardId: null,
    cardTitle: null,
    message: '"To Do" has 7 cards (limit 6).',
  },
];

describe("BottlenecksPanel", () => {
  it("shows an empty state when there are no bottlenecks", () => {
    render(<BottlenecksPanel bottlenecks={[]} onGetAdvice={vi.fn()} />);

    expect(screen.getByText("No bottlenecks right now.")).toBeInTheDocument();
  });

  it("lists each bottleneck's message", () => {
    render(<BottlenecksPanel bottlenecks={bottlenecks} onGetAdvice={vi.fn()} />);

    expect(
      screen.getByText('"Migrate DB" has been in "In Progress" for 6 days.')
    ).toBeInTheDocument();
    expect(screen.getByText('"To Do" has 7 cards (limit 6).')).toBeInTheDocument();
    expect(screen.queryByText("No bottlenecks right now.")).not.toBeInTheDocument();
  });

  it("hides the advice button when there are no bottlenecks", () => {
    render(<BottlenecksPanel bottlenecks={[]} onGetAdvice={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Get AI advice" })).not.toBeInTheDocument();
  });

  it("shows the advice button when there are bottlenecks", () => {
    render(<BottlenecksPanel bottlenecks={bottlenecks} onGetAdvice={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Get AI advice" })).toBeInTheDocument();
  });

  it("shows a loading state and then renders the returned advice", async () => {
    const user = userEvent.setup();
    let resolveAdvice: (value: string) => void = () => {};
    const onGetAdvice = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveAdvice = resolve;
        })
    );

    render(<BottlenecksPanel bottlenecks={bottlenecks} onGetAdvice={onGetAdvice} />);

    await user.click(screen.getByRole("button", { name: "Get AI advice" }));

    expect(screen.getByRole("button", { name: "Thinking…" })).toBeDisabled();

    resolveAdvice("Pair on Migrate DB today.");

    expect(await screen.findByText("Pair on Migrate DB today.")).toBeInTheDocument();
    expect(onGetAdvice).toHaveBeenCalledTimes(1);
  });

  it("shows an error when getting advice fails", async () => {
    const user = userEvent.setup();
    const onGetAdvice = vi.fn().mockRejectedValue(new Error("boom"));

    render(<BottlenecksPanel bottlenecks={bottlenecks} onGetAdvice={onGetAdvice} />);

    await user.click(screen.getByRole("button", { name: "Get AI advice" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not get AI advice. Please try again."
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Get AI advice" })).not.toBeDisabled()
    );
  });
});
