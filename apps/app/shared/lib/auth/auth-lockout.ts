import { isRecord } from "@workspace/utils";

const LOGIN_LOCKOUT_STORAGE_KEY = "docita_login_lockout_until";
const DEFAULT_LOGIN_LOCKOUT_MINUTES = 15;

export function readLoginLockoutUntil(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LOGIN_LOCKOUT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= Date.now()) {
    window.localStorage.removeItem(LOGIN_LOCKOUT_STORAGE_KEY);
    return null;
  }

  return parsed;
}

export function persistLoginLockoutUntil(until: number | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (until) {
    window.localStorage.setItem(LOGIN_LOCKOUT_STORAGE_KEY, String(until));
    return;
  }

  window.localStorage.removeItem(LOGIN_LOCKOUT_STORAGE_KEY);
}

export function isLoginLockoutResponse(status: number, body: unknown): boolean {
  if (status === 423) {
    return true;
  }

  if (!body || typeof body !== "object") {
    return false;
  }

  const code =
    isRecord(body) && typeof body.code === "string" ? body.code : "";
  const message =
    isRecord(body) && typeof body.message === "string"
      ? body.message.toLowerCase()
      : "";

  return code === "ACCOUNT_LOCKED" || message.includes("account is locked");
}

export function parseLoginLockoutUntil(
  status: number,
  body: unknown,
): number | null {
  if (!isLoginLockoutResponse(status, body)) {
    return null;
  }

  const message =
    isRecord(body) && typeof body.message === "string" ? body.message : "";

  const minuteMatch = message.match(/try again in (\d+) minute\(s\)/i);
  if (minuteMatch?.[1]) {
    const minutes = Number(minuteMatch[1]);
    if (Number.isFinite(minutes) && minutes > 0) {
      return Date.now() + minutes * 60_000;
    }
  }

  const secondMatch = message.match(/try again in (\d+) second\(s\)/i);
  if (secondMatch?.[1]) {
    const seconds = Number(secondMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Date.now() + seconds * 1000;
    }
  }

  return Date.now() + DEFAULT_LOGIN_LOCKOUT_MINUTES * 60_000;
}

export function formatLoginLockoutMessage(lockoutUntil: number): string {
  const remainingMs = lockoutUntil - Date.now();
  if (remainingMs <= 0) {
    return "Your account lockout has expired. Please try signing in again.";
  }

  const minutesRemaining = Math.ceil(remainingMs / 60_000);
  return `Account is locked due to too many failed login attempts. Try again in ${minutesRemaining} minute(s).`;
}
