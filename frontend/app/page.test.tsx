import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import * as auth from "@/lib/auth";
import { initialBoard } from "@/lib/initialData";
import * as api from "@/lib/api";
import type { BoardSummary } from "@/lib/types";

vi.mock("@/lib/api");
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    hasStoredSession: vi.fn(),
    login: vi.fn(),
  };
});

const oneBoard: BoardSummary[] = [
  { id: 1, name: "My Board", createdAt: "2026-01-01T00:00:00.000Z" },
];

const twoBoards: BoardSummary[] = [
  { id: 1, name: "My Board", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: 2, name: "Marketing", createdAt: "2026-01-02T00:00:00.000Z" },
];

function signedIn() {
  vi.mocked(auth.hasStoredSession).mockReturnValue(true);
}

afterEach(() => {
  vi.mocked(api.fetchBoard).mockReset();
  vi.mocked(api.fetchBoards).mockReset();
  vi.mocked(api.createBoard).mockReset();
  vi.mocked(api.renameBoard).mockReset();
  vi.mocked(api.deleteBoard).mockReset();
  vi.mocked(auth.hasStoredSession).mockReset();
  vi.mocked(auth.login).mockReset();
});

describe("Home", () => {
  it("shows the login form when there is no session", () => {
    vi.mocked(auth.hasStoredSession).mockReturnValue(false);

    render(<Home />);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("loads boards and the active board when a session is already stored", async () => {
    signedIn();
    vi.mocked(api.fetchBoards).mockResolvedValue(oneBoard);
    vi.mocked(api.fetchBoard).mockResolvedValue(structuredClone(initialBoard));

    render(<Home />);

    expect(screen.getByRole("heading", { name: "Project Board" })).toBeInTheDocument();
    expect(await screen.findByTestId("column-col-backlog")).toBeInTheDocument();
  });

  it("shows the board after signing in successfully", async () => {
    vi.mocked(auth.hasStoredSession).mockReturnValue(false);
    vi.mocked(auth.login).mockResolvedValue(undefined);
    vi.mocked(api.fetchBoards).mockResolvedValue(oneBoard);
    vi.mocked(api.fetchBoard).mockResolvedValue(structuredClone(initialBoard));
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByLabelText("Username"), "user");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("heading", { name: "Project Board" })).toBeInTheDocument();
    expect(await screen.findByTestId("column-col-backlog")).toBeInTheDocument();
  });

  it("shows a board switcher tab per board once there is more than one", async () => {
    signedIn();
    vi.mocked(api.fetchBoards).mockResolvedValue(twoBoards);
    vi.mocked(api.fetchBoard).mockResolvedValue(structuredClone(initialBoard));

    render(<Home />);

    expect(await screen.findByRole("button", { name: "My Board" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marketing" })).toBeInTheDocument();
  });

  it("switches the active board when a different tab is selected", async () => {
    signedIn();
    vi.mocked(api.fetchBoards).mockResolvedValue(twoBoards);
    const boardOne = structuredClone(initialBoard);
    const boardTwo = { ...structuredClone(initialBoard), id: 2, name: "Marketing" };
    vi.mocked(api.fetchBoard).mockImplementation((boardId: number) =>
      Promise.resolve(boardId === 1 ? boardOne : boardTwo)
    );
    const user = userEvent.setup();

    render(<Home />);
    await screen.findByTestId("column-col-backlog");

    await user.click(screen.getByRole("button", { name: "Marketing" }));

    expect(api.fetchBoard).toHaveBeenCalledWith(2);
  });

  it("creates a new board and switches to it", async () => {
    signedIn();
    vi.mocked(api.fetchBoards).mockResolvedValue(oneBoard);
    vi.mocked(api.fetchBoard).mockResolvedValue(structuredClone(initialBoard));
    vi.mocked(api.createBoard).mockResolvedValue({
      id: 2,
      name: "Sprint 2",
      createdAt: "2026-01-03T00:00:00.000Z",
    });
    const user = userEvent.setup();

    render(<Home />);
    await screen.findByTestId("column-col-backlog");

    await user.click(screen.getByRole("button", { name: "+ New board" }));
    await user.type(screen.getByLabelText("New board name"), "Sprint 2");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(api.createBoard).toHaveBeenCalledWith("Sprint 2");
    expect(await screen.findByRole("button", { name: "Sprint 2" })).toBeInTheDocument();
  });

  it("returns to the login form after logging out", async () => {
    signedIn();
    vi.mocked(api.fetchBoards).mockResolvedValue(oneBoard);
    vi.mocked(api.fetchBoard).mockResolvedValue(structuredClone(initialBoard));
    const user = userEvent.setup();

    render(<Home />);
    await screen.findByTestId("column-col-backlog");

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows an error banner when boards cannot be loaded", async () => {
    signedIn();
    vi.mocked(api.fetchBoards).mockRejectedValue(new Error("network down"));

    render(<Home />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load your boards. Is the backend running?"
    );
  });
});
