import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanCard } from "@/components/KanbanCard";

describe("KanbanCard", () => {
  it("renders the title and details", () => {
    render(
      <KanbanCard
        card={{
          id: "card-1",
          title: "Ship MVP",
          details: "Launch it",
          statusChangedAt: new Date().toISOString(),
        }}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Ship MVP")).toBeInTheDocument();
    expect(screen.getByText("Launch it")).toBeInTheDocument();
  });

  it("omits the details paragraph when details are empty", () => {
    render(
      <KanbanCard
        card={{
          id: "card-1",
          title: "Ship MVP",
          details: "",
          statusChangedAt: new Date().toISOString(),
        }}
        onDelete={vi.fn()}
      />
    );

    expect(screen.queryByText("Launch it")).not.toBeInTheDocument();
  });

  it("does not show a stale badge by default", () => {
    render(
      <KanbanCard
        card={{
          id: "card-1",
          title: "Ship MVP",
          details: "",
          statusChangedAt: new Date().toISOString(),
        }}
        onDelete={vi.fn()}
      />
    );

    expect(screen.queryByLabelText("Ship MVP is stale")).not.toBeInTheDocument();
  });

  it("shows a stale badge when isStale is true", () => {
    render(
      <KanbanCard
        card={{
          id: "card-1",
          title: "Ship MVP",
          details: "",
          statusChangedAt: new Date().toISOString(),
        }}
        isStale
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Ship MVP is stale")).toBeInTheDocument();
  });

  it("calls onDelete when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <KanbanCard
        card={{
          id: "card-1",
          title: "Ship MVP",
          details: "Launch it",
          statusChangedAt: new Date().toISOString(),
        }}
        onDelete={onDelete}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete card Ship MVP" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
