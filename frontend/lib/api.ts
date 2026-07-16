import type { Board, BoardSummary, Card, Column, Priority } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "kanban-token";
const USERNAME_KEY = "kanban-username";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredUsername(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return sessionStorage.getItem(USERNAME_KEY);
}

function storeAuth(token: string, username: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USERNAME_KEY, username);
}

export function clearAuth(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USERNAME_KEY);
}

function capitalize(message: string): string {
  return message.charAt(0).toUpperCase() + message.slice(1);
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    const detail = data?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return capitalize(detail);
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const messages = detail
        .map((item) => (typeof item?.msg === "string" ? item.msg : null))
        .filter((msg): msg is string => Boolean(msg))
        .map((msg) => msg.replace(/^Value error,\s*/, ""));
      if (messages.length > 0) {
        return capitalize(messages.join(" "));
      }
    }
  } catch {
    // response body wasn't JSON (or was empty) — fall through to the generic message
  }
  return `Request failed with status ${response.status}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...init,
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

type AuthResponse = { token: string; username: string };

export async function register(username: string, password: string): Promise<string> {
  const body = await request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  storeAuth(body.token, body.username);
  return body.username;
}

export async function login(username: string, password: string): Promise<string> {
  const body = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  storeAuth(body.token, body.username);
  return body.username;
}

export async function logout(): Promise<void> {
  try {
    await request<void>("/auth/logout", { method: "POST" });
  } finally {
    clearAuth();
  }
}

export function fetchBoards(): Promise<BoardSummary[]> {
  return request<BoardSummary[]>("/boards");
}

export function createBoard(name: string): Promise<BoardSummary> {
  return request<BoardSummary>("/boards", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function renameBoard(boardId: number, name: string): Promise<BoardSummary> {
  return request<BoardSummary>(`/boards/${boardId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function deleteBoard(boardId: number): Promise<void> {
  return request<void>(`/boards/${boardId}`, { method: "DELETE" });
}

export function fetchBoard(boardId: number): Promise<Board> {
  return request<Board>(`/boards/${boardId}`);
}

export function renameColumn(boardId: number, columnId: string, title: string): Promise<Column> {
  return request<Column>(`/boards/${boardId}/columns/${columnId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export function createCard(
  boardId: number,
  columnId: string,
  title: string,
  details: string,
  priority: Priority = "medium",
  dueDate: string | null = null
): Promise<Card> {
  return request<Card>(`/boards/${boardId}/columns/${columnId}/cards`, {
    method: "POST",
    body: JSON.stringify({ title, details, priority, dueDate }),
  });
}

export type CardUpdate = {
  title?: string;
  details?: string;
  priority?: Priority;
  dueDate?: string | null;
  clearDueDate?: boolean;
};

export function updateCard(boardId: number, cardId: string, updates: CardUpdate): Promise<Card> {
  return request<Card>(`/boards/${boardId}/cards/${cardId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteCard(boardId: number, cardId: string): Promise<void> {
  return request<void>(`/boards/${boardId}/cards/${cardId}`, { method: "DELETE" });
}

export function moveCard(
  boardId: number,
  cardId: string,
  toColumnId: string,
  toIndex: number
): Promise<Card> {
  return request<Card>(`/boards/${boardId}/cards/${cardId}/move`, {
    method: "POST",
    body: JSON.stringify({ toColumnId, toIndex }),
  });
}

export function sendChatMessage(boardId: number, message: string): Promise<{ reply: string }> {
  return request<{ reply: string }>(`/boards/${boardId}/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function getBottleneckAdvice(boardId: number): Promise<{ advice: string }> {
  return request<{ advice: string }>(`/boards/${boardId}/bottlenecks/advice`, {
    method: "POST",
  });
}
