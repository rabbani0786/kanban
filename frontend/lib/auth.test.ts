import { afterEach, describe, expect, it } from "vitest";
import { checkCredentials, clearSession, hasStoredSession, storeSession } from "./auth";

describe("checkCredentials", () => {
  it("accepts the hardcoded username and password", () => {
    expect(checkCredentials("user", "password")).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(checkCredentials("user", "wrong")).toBe(false);
  });

  it("rejects a wrong username", () => {
    expect(checkCredentials("someone", "password")).toBe(false);
  });
});

describe("session storage helpers", () => {
  afterEach(() => {
    clearSession();
  });

  it("has no session by default", () => {
    expect(hasStoredSession()).toBe(false);
  });

  it("reports a session once stored", () => {
    storeSession();
    expect(hasStoredSession()).toBe(true);
  });

  it("clears a stored session", () => {
    storeSession();
    clearSession();
    expect(hasStoredSession()).toBe(false);
  });
});
