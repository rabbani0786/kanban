import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { clearSession, storeSession } from "@/lib/auth";
import { initialBoard } from "@/lib/initialData";
import * as api from "@/lib/api";

vi.mock("@/lib/api");

describe("Home", () => {
  afterEach(() => {
    clearSession();
    vi.mocked(api.fetchBoard).mockReset();
  });

  it("shows the login form when there is no session", () => {
    render(<Home />);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows the board immediately when a session is already stored", async () => {
    vi.mocked(api.fetchBoard).mockResolvedValue(structuredClone(initialBoard));
    storeSession();

    render(<Home />);

    expect(screen.getByRole("heading", { name: "Project Board" })).toBeInTheDocument();
    expect(await screen.findByTestId("column-col-backlog")).toBeInTheDocument();
  });

  it("shows the board after signing in successfully", async () => {
    vi.mocked(api.fetchBoard).mockResolvedValue(structuredClone(initialBoard));
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByLabelText("Username"), "user");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("heading", { name: "Project Board" })).toBeInTheDocument();
  });

  it("returns to the login form after logging out", async () => {
    vi.mocked(api.fetchBoard).mockResolvedValue(structuredClone(initialBoard));
    const user = userEvent.setup();
    storeSession();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});
