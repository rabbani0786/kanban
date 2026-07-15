import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardPreview } from "@/components/CardPreview";

const statusChangedAt = new Date().toISOString();

describe("CardPreview", () => {
  it("renders the card title and details", () => {
    render(
      <CardPreview
        card={{
          id: "card-1",
          title: "Ship MVP",
          details: "Launch it",
          priority: "medium",
          dueDate: null,
          statusChangedAt,
        }}
      />
    );

    expect(screen.getByText("Ship MVP")).toBeInTheDocument();
    expect(screen.getByText("Launch it")).toBeInTheDocument();
  });

  it("omits the details paragraph when details are empty", () => {
    render(
      <CardPreview
        card={{
          id: "card-1",
          title: "Ship MVP",
          details: "",
          priority: "medium",
          dueDate: null,
          statusChangedAt,
        }}
      />
    );

    expect(screen.getByText("Ship MVP")).toBeInTheDocument();
    expect(screen.queryByText("Launch it")).not.toBeInTheDocument();
  });

  it("shows the card's priority badge", () => {
    render(
      <CardPreview
        card={{
          id: "card-1",
          title: "Ship MVP",
          details: "",
          priority: "high",
          dueDate: null,
          statusChangedAt,
        }}
      />
    );

    expect(screen.getByText("high")).toBeInTheDocument();
  });
});
