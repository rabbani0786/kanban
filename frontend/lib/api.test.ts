import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "./api";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function noContentResponse(): Response {
  return { ok: true, status: 204, json: () => Promise.resolve(undefined) } as unknown as Response;
}

function errorResponse(status: number): Response {
  return { ok: false, status, json: () => Promise.resolve({}) } as unknown as Response;
}

describe("api", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("token storage", () => {
    it("has no token or username by default", () => {
      expect(api.getToken()).toBeNull();
      expect(api.getStoredUsername()).toBeNull();
    });

    it("clears any stored auth", () => {
      sessionStorage.setItem("kanban-token", "abc");
      sessionStorage.setItem("kanban-username", "alice");

      api.clearAuth();

      expect(api.getToken()).toBeNull();
      expect(api.getStoredUsername()).toBeNull();
    });
  });

  describe("register", () => {
    it("stores the token and username and returns the username", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ token: "tok-1", username: "alice" }, 201)
      );

      const username = await api.register("alice", "password123");

      expect(username).toBe("alice");
      expect(api.getToken()).toBe("tok-1");
      expect(api.getStoredUsername()).toBe("alice");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/register"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("throws when registration fails", async () => {
      vi.mocked(fetch).mockResolvedValue(errorResponse(409));

      await expect(api.register("alice", "password123")).rejects.toThrow(
        "status 409"
      );
    });

    it("surfaces the backend's detail message for a duplicate username", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ detail: "username is already taken" }, 409)
      );

      await expect(api.register("alice", "password123")).rejects.toThrow(
        "Username is already taken"
      );
    });

    it("surfaces a pydantic validation message for a short password", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(
          {
            detail: [
              {
                type: "value_error",
                loc: ["body", "password"],
                msg: "Value error, password must be at least 8 characters",
              },
            ],
          },
          422
        )
      );

      await expect(api.register("alice", "short")).rejects.toThrow(
        "Password must be at least 8 characters"
      );
    });

    it("reports an unreachable server distinctly from a validation error", async () => {
      vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(api.register("alice", "password123")).rejects.toThrow(
        "Could not reach the server"
      );
    });
  });

  describe("login", () => {
    it("stores the token and username", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ token: "tok-2", username: "bob" }));

      await api.login("bob", "password");

      expect(api.getToken()).toBe("tok-2");
      expect(api.getStoredUsername()).toBe("bob");
    });

    it("throws on invalid credentials", async () => {
      vi.mocked(fetch).mockResolvedValue(errorResponse(401));

      await expect(api.login("bob", "wrong")).rejects.toThrow("status 401");
    });
  });

  describe("logout", () => {
    it("clears auth even when the request succeeds", async () => {
      sessionStorage.setItem("kanban-token", "tok-3");
      vi.mocked(fetch).mockResolvedValue(noContentResponse());

      await api.logout();

      expect(api.getToken()).toBeNull();
    });

    it("still clears auth if the logout request fails", async () => {
      sessionStorage.setItem("kanban-token", "tok-4");
      vi.mocked(fetch).mockResolvedValue(errorResponse(500));

      await expect(api.logout()).rejects.toThrow();
      expect(api.getToken()).toBeNull();
    });
  });

  describe("requests attach the stored token", () => {
    it("sends an Authorization header once a token is stored", async () => {
      sessionStorage.setItem("kanban-token", "tok-5");
      vi.mocked(fetch).mockResolvedValue(jsonResponse([]));

      await api.fetchBoards();

      const [, init] = vi.mocked(fetch).mock.calls[0];
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer tok-5");
    });

    it("omits the Authorization header when there is no token", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse([]));

      await api.fetchBoards();

      const [, init] = vi.mocked(fetch).mock.calls[0];
      expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
    });
  });

  describe("board endpoints", () => {
    it("creates a board", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ id: 1, name: "New board", createdAt: "2026-01-01T00:00:00.000Z" })
      );

      const board = await api.createBoard("New board");

      expect(board.name).toBe("New board");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/boards"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("renames a board", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ id: 1, name: "Renamed", createdAt: "2026-01-01T00:00:00.000Z" })
      );

      const board = await api.renameBoard(1, "Renamed");

      expect(board.name).toBe("Renamed");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/boards/1"),
        expect.objectContaining({ method: "PATCH" })
      );
    });

    it("deletes a board", async () => {
      vi.mocked(fetch).mockResolvedValue(noContentResponse());

      await expect(api.deleteBoard(1)).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/boards/1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("fetches a single board", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({
          id: 1,
          name: "My Board",
          columns: [],
          cards: {},
          bottlenecks: [],
          staleCardDays: 5,
          columnCardLimit: 6,
        })
      );

      const board = await api.fetchBoard(1);

      expect(board.id).toBe(1);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/boards/1"), expect.anything());
    });
  });

  describe("column and card endpoints", () => {
    it("renames a column", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ id: "col-1", title: "Ready", cardIds: [], isOverloaded: false })
      );

      const column = await api.renameColumn(1, "col-1", "Ready");

      expect(column.title).toBe("Ready");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/boards/1/columns/col-1"),
        expect.objectContaining({ method: "PATCH" })
      );
    });

    it("creates a card with defaults", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({
          id: "card-1",
          title: "Task",
          details: "",
          priority: "medium",
          dueDate: null,
          statusChangedAt: "2026-01-01T00:00:00.000Z",
          isStale: false,
        })
      );

      const card = await api.createCard(1, "col-1", "Task", "");

      expect(card.title).toBe("Task");
      const [, init] = vi.mocked(fetch).mock.calls[0];
      expect(JSON.parse(init?.body as string)).toEqual({
        title: "Task",
        details: "",
        priority: "medium",
        dueDate: null,
      });
    });

    it("updates a card", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({
          id: "card-1",
          title: "Task",
          details: "",
          priority: "high",
          dueDate: null,
          statusChangedAt: "2026-01-01T00:00:00.000Z",
          isStale: false,
        })
      );

      const card = await api.updateCard(1, "card-1", { priority: "high" });

      expect(card.priority).toBe("high");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/boards/1/cards/card-1"),
        expect.objectContaining({ method: "PATCH" })
      );
    });

    it("deletes a card", async () => {
      vi.mocked(fetch).mockResolvedValue(noContentResponse());

      await expect(api.deleteCard(1, "card-1")).resolves.toBeUndefined();
    });

    it("moves a card", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({
          id: "card-1",
          title: "Task",
          details: "",
          priority: "medium",
          dueDate: null,
          statusChangedAt: "2026-01-01T00:00:00.000Z",
          isStale: false,
        })
      );

      await api.moveCard(1, "card-1", "col-2", 0);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/boards/1/cards/card-1/move"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("AI endpoints", () => {
    it("sends a chat message scoped to a board", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ reply: "Done." }));

      const { reply } = await api.sendChatMessage(1, "add a card");

      expect(reply).toBe("Done.");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/boards/1/chat"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("gets bottleneck advice scoped to a board", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ advice: "Looks fine." }));

      const { advice } = await api.getBottleneckAdvice(1);

      expect(advice).toBe("Looks fine.");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/boards/1/bottlenecks/advice"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("error handling", () => {
    it("throws with the failing status code", async () => {
      vi.mocked(fetch).mockResolvedValue(errorResponse(404));

      await expect(api.fetchBoard(999)).rejects.toThrow("status 404");
    });
  });
});
