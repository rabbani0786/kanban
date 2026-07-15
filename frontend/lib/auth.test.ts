import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "./api";
import { clearSession, currentUsername, hasStoredSession, login, logout, register } from "./auth";

vi.mock("./api");

afterEach(() => {
  clearSession();
  vi.mocked(api.login).mockReset();
  vi.mocked(api.register).mockReset();
  vi.mocked(api.logout).mockReset();
  vi.mocked(api.getToken).mockReset();
  vi.mocked(api.getStoredUsername).mockReset();
});

describe("hasStoredSession", () => {
  it("is false when there is no token", () => {
    vi.mocked(api.getToken).mockReturnValue(null);

    expect(hasStoredSession()).toBe(false);
  });

  it("is true once a token is stored", () => {
    vi.mocked(api.getToken).mockReturnValue("a-token");

    expect(hasStoredSession()).toBe(true);
  });
});

describe("currentUsername", () => {
  it("returns the stored username", () => {
    vi.mocked(api.getStoredUsername).mockReturnValue("alice");

    expect(currentUsername()).toBe("alice");
  });
});

describe("login", () => {
  it("delegates to the api login call", async () => {
    vi.mocked(api.login).mockResolvedValue("user");

    await login("user", "password");

    expect(api.login).toHaveBeenCalledWith("user", "password");
  });

  it("propagates a rejection for invalid credentials", async () => {
    vi.mocked(api.login).mockRejectedValue(new Error("Request failed with status 401"));

    await expect(login("user", "wrong")).rejects.toThrow();
  });
});

describe("register", () => {
  it("delegates to the api register call", async () => {
    vi.mocked(api.register).mockResolvedValue("newuser");

    await register("newuser", "password123");

    expect(api.register).toHaveBeenCalledWith("newuser", "password123");
  });

  it("propagates a rejection for a duplicate username", async () => {
    vi.mocked(api.register).mockRejectedValue(new Error("Request failed with status 409"));

    await expect(register("user", "password123")).rejects.toThrow();
  });
});

describe("logout", () => {
  it("delegates to the api logout call", async () => {
    vi.mocked(api.logout).mockResolvedValue(undefined);

    await logout();

    expect(api.logout).toHaveBeenCalledTimes(1);
  });
});

describe("clearSession", () => {
  it("delegates to the api clearAuth call", () => {
    clearSession();

    expect(api.clearAuth).toHaveBeenCalled();
  });
});
