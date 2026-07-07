import type { Board, Card, Column } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function fetchBoard(): Promise<Board> {
  return request<Board>("/board");
}

export function renameColumn(columnId: string, title: string): Promise<Column> {
  return request<Column>(`/columns/${columnId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export function createCard(columnId: string, title: string, details: string): Promise<Card> {
  return request<Card>(`/columns/${columnId}/cards`, {
    method: "POST",
    body: JSON.stringify({ title, details }),
  });
}

export function deleteCard(cardId: string): Promise<void> {
  return request<void>(`/cards/${cardId}`, { method: "DELETE" });
}

export function moveCard(cardId: string, toColumnId: string, toIndex: number): Promise<Card> {
  return request<Card>(`/cards/${cardId}/move`, {
    method: "POST",
    body: JSON.stringify({ toColumnId, toIndex }),
  });
}

export function sendChatMessage(message: string): Promise<{ reply: string }> {
  return request<{ reply: string }>("/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function getBottleneckAdvice(): Promise<{ advice: string }> {
  return request<{ advice: string }>("/bottlenecks/advice", { method: "POST" });
}
