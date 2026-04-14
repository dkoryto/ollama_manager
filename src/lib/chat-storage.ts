export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  rating?: number;
  model?: string;
};

export type ChatSession = {
  id: string;
  title: string;
  model: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "ollama-chat-sessions";

export function getChatSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveChatSessions(sessions: ChatSession[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

import { generateId } from "./generate-id";

export function createChatSession(model: string): ChatSession {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: "Nowy chat",
    model,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function updateChatSession(
  sessionId: string,
  updates: Partial<ChatSession>
) {
  const sessions = getChatSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return;
  sessions[idx] = { ...sessions[idx], ...updates, updatedAt: new Date().toISOString() };
  saveChatSessions(sessions);
}

export function deleteChatSession(sessionId: string) {
  const sessions = getChatSessions().filter((s) => s.id !== sessionId);
  saveChatSessions(sessions);
}

export function generateTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "Nowy chat";
  const text = firstUser.content.trim();
  if (text.length <= 30) return text;
  return text.slice(0, 30) + "…";
}
