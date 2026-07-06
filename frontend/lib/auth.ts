const SESSION_KEY = "kanban-session";
const VALID_USERNAME = "user";
const VALID_PASSWORD = "password";

export function checkCredentials(username: string, password: string): boolean {
  return username === VALID_USERNAME && password === VALID_PASSWORD;
}

export function hasStoredSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

export function storeSession(): void {
  sessionStorage.setItem(SESSION_KEY, "true");
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
