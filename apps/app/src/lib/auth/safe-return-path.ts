import { APP_REDIRECT_AFTER_LOGIN_KEY, appSession } from "@/lib/auth/session";

const MAX_RETURN_PATH_LENGTH = 2048;

const AUTH_SHELL_PATH_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/portal/login",
] as const;

function isAuthShellPath(path: string): boolean {
  const pathOnly = path.split("?")[0] ?? path;
  return AUTH_SHELL_PATH_PREFIXES.some(
    (p) => pathOnly === p || pathOnly.startsWith(`${p}/`),
  );
}

/**
 * Same-origin internal path only, safe to use after login (open-redirect safe).
 */
export function sanitizeAppReturnPath(
  raw: string | null | undefined,
): string | null {
  if (raw == null || typeof raw !== "string") return null;

  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  if (path.includes("://") || path.includes("\\")) {
    return null;
  }

  if (path.length > MAX_RETURN_PATH_LENGTH) return null;

  const firstSegment = path.slice(1).split(/[/?#]/)[0];
  if (firstSegment?.includes("@")) {
    return null;
  }

  if (isAuthShellPath(path)) {
    return null;
  }

  return path;
}

export function persistReturnPathBeforeLogin(): void {
  if (typeof window === "undefined") {
    return;
  }

  const pathnamePart = window.location.pathname;
  if (appSession.isPublicPath(pathnamePart)) {
    return;
  }

  const prior = sessionStorage.getItem(APP_REDIRECT_AFTER_LOGIN_KEY)?.trim();
  if (prior && sanitizeAppReturnPath(prior)) {
    return;
  }

  const candidate = `${pathnamePart}${window.location.search}`;
  const safe = sanitizeAppReturnPath(candidate);
  if (!safe) {
    return;
  }

  sessionStorage.setItem(APP_REDIRECT_AFTER_LOGIN_KEY, safe);
}

export function clearStoredReturnPathBeforeLogin(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(APP_REDIRECT_AFTER_LOGIN_KEY);
}
