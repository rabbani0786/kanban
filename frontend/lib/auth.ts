import {
  clearAuth,
  getStoredUsername,
  getToken,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from "./api";

export function hasStoredSession(): boolean {
  return getToken() !== null;
}

export function currentUsername(): string | null {
  return getStoredUsername();
}

export async function login(username: string, password: string): Promise<void> {
  await apiLogin(username, password);
}

export async function register(username: string, password: string): Promise<void> {
  await apiRegister(username, password);
}

export async function logout(): Promise<void> {
  await apiLogout();
}

export function clearSession(): void {
  clearAuth();
}
