import { isRecord } from "@workspace/utils";

const DEFAULT_LOGIN_LOCKOUT_MINUTES = 15;
const LOCKOUT_STATUS = 423;

const durationPatterns = [
  { pattern: /try again in (\d+) minute\(s\)/i, unitMs: 60_000 },
  { pattern: /try again in (\d+) second\(s\)/i, unitMs: 1000 },
];

function stringField(body: unknown, key: string): string {
  if (!isRecord(body)) return "";
  const value = body[key];
  return typeof value === "string" ? value : "";
}

export function isLoginLockoutResponse(status: number, body: unknown): boolean {
  if (status === LOCKOUT_STATUS) return true;

  const code = stringField(body, "code");
  const message = stringField(body, "message").toLowerCase();
  return code === "ACCOUNT_LOCKED" || message.includes("account is locked");
}

function durationFromMessage(message: string): number | null {
  const match = durationPatterns
    .map(({ pattern, unitMs }) => ({
      amount: Number(message.match(pattern)?.[1]),
      unitMs,
    }))
    .find(({ amount }) => Number.isFinite(amount) && amount > 0);

  return match ? match.amount * match.unitMs : null;
}

export function parseLoginLockoutUntil(
  status: number,
  body: unknown,
): number | null {
  if (!isLoginLockoutResponse(status, body)) {
    return null;
  }

  const message = stringField(body, "message");
  const durationMs =
    durationFromMessage(message) ?? DEFAULT_LOGIN_LOCKOUT_MINUTES * 60_000;

  return Date.now() + durationMs;
}

export function formatLoginLockoutMessage(lockoutUntil: number): string {
  const remainingMs = lockoutUntil - Date.now();
  if (remainingMs <= 0) {
    return "Your account lockout has expired. Please try signing in again.";
  }

  const minutesRemaining = Math.ceil(remainingMs / 60_000);
  return `Account is locked due to too many failed login attempts. Try again in ${minutesRemaining} minute(s).`;
}
