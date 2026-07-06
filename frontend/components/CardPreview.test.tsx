import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardPreview } from "@/components/CardPreview";

describe("CardPreview", () => {
  it("renders the card title and details", () => {
    render(
      <CardPreview card={{ id: "card-1", title: "Ship MVP", details: "Launch it" }} />
    );

    expect(screen.getByText("Ship MVP")).toBeInTheDocument();
    expect(screen.getByText("Launch it")).toBeInTheDocument();
  });

  it("omits the details paragraph when details are empty", () => {
    render(<CardPreview card={{ id: "card-1", title: "Ship MVP", details: "" }} />);

    expect(screen.getByText("Ship MVP")).toBeInTheDocument();
    expect(screen.queryByText("Launch it")).not.toBeInTheDocument();
  });
});
