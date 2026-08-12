const LOGIN_LOCKOUT_STORAGE_KEY = "docita_login_lockout_until";

export function readLoginLockoutUntil(): number | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(LOGIN_LOCKOUT_STORAGE_KEY);
  if (!raw) return null;

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
