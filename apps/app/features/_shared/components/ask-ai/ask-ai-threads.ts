export interface AskAiStoredMessage {
  id: string;
  author: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface AskAiStoredThread {
  id: string;
  title: string;
  scopeLabel: string | null;
  createdAt: number;
  updatedAt: number;
  messages: AskAiStoredMessage[];
}

const STORAGE_KEY = "docita.ask-ai.threads.v1";
const MAX_THREADS = 30;

function isBrowser(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadThreads(): AskAiStoredThread[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidThread);
  } catch {
    return [];
  }
}

export function saveThreads(threads: AskAiStoredThread[]): void {
  if (!isBrowser()) return;
  try {
    const trimmed = threads
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_THREADS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore quota errors
  }
}

export function upsertThread(
  threads: AskAiStoredThread[],
  next: AskAiStoredThread,
): AskAiStoredThread[] {
  const index = threads.findIndex((t) => t.id === next.id);
  if (index === -1) return [next, ...threads];
  const copy = threads.slice();
  copy[index] = next;
  return copy;
}

export function isToday(timestamp: number, now = Date.now()): boolean {
  const a = new Date(timestamp);
  const b = new Date(now);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function deriveTitle(content: string): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New thread";
  return cleaned.length > 60 ? `${cleaned.slice(0, 57).trimEnd()}…` : cleaned;
}

function isValidThread(value: unknown): value is AskAiStoredThread {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    typeof t.createdAt === "number" &&
    typeof t.updatedAt === "number" &&
    Array.isArray(t.messages)
  );
}
