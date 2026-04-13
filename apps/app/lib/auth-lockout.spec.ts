import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatLoginLockoutMessage,
  isLoginLockoutResponse,
  parseLoginLockoutUntil,
  persistLoginLockoutUntil,
  readLoginLockoutUntil,
} from "@/lib/auth-lockout";

const NOW = new Date("2026-04-10T10:00:00.000Z");

describe("auth lockout helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("detects explicit and message-based lockout responses", () => {
    expect(isLoginLockoutResponse(423, null)).toBe(true);
    expect(isLoginLockoutResponse(401, { code: "ACCOUNT_LOCKED" })).toBe(true);
    expect(
      isLoginLockoutResponse(401, {
        message: "Account is locked due to too many attempts",
      }),
    ).toBe(true);
    expect(isLoginLockoutResponse(401, { message: "Invalid password" })).toBe(
      false,
    );
  });

  it("parses minute and second retry windows from lockout responses", () => {
    expect(
      parseLoginLockoutUntil(423, {
        message: "Account is locked. Try again in 3 minute(s).",
      }),
    ).toBe(NOW.getTime() + 3 * 60_000);

    expect(
      parseLoginLockoutUntil(423, {
        message: "Account is locked. Try again in 45 second(s).",
      }),
    ).toBe(NOW.getTime() + 45_000);
  });

  it("falls back to the default lockout window when retry text is absent", () => {
    expect(parseLoginLockoutUntil(423, { message: "Account is locked" })).toBe(
      NOW.getTime() + 15 * 60_000,
    );
    expect(parseLoginLockoutUntil(401, { message: "Invalid password" })).toBe(
      null,
    );
  });

  it("persists active lockouts and clears expired or invalid values", () => {
    const activeUntil = NOW.getTime() + 60_000;

    persistLoginLockoutUntil(activeUntil);
    expect(readLoginLockoutUntil()).toBe(activeUntil);

    localStorage.setItem("docita_login_lockout_until", String(NOW.getTime()));
    expect(readLoginLockoutUntil()).toBe(null);
    expect(localStorage.getItem("docita_login_lockout_until")).toBe(null);

    localStorage.setItem("docita_login_lockout_until", "not-a-number");
    expect(readLoginLockoutUntil()).toBe(null);
    expect(localStorage.getItem("docita_login_lockout_until")).toBe(null);
  });

  it("formats remaining lockout time with minute rounding", () => {
    expect(formatLoginLockoutMessage(NOW.getTime() + 61_000)).toBe(
      "Account is locked due to too many failed login attempts. Try again in 2 minute(s).",
    );
    expect(formatLoginLockoutMessage(NOW.getTime())).toBe(
      "Your account lockout has expired. Please try signing in again.",
    );
  });
});
