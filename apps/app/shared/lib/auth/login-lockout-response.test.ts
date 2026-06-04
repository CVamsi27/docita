import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatLoginLockoutMessage,
  isLoginLockoutResponse,
  parseLoginLockoutUntil,
} from "./login-lockout-response";

describe("login lockout response helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("detects lockout responses by status, code, or message", () => {
    expect(isLoginLockoutResponse(423, null)).toBe(true);
    expect(isLoginLockoutResponse(400, { code: "ACCOUNT_LOCKED" })).toBe(true);
    expect(
      isLoginLockoutResponse(400, { message: "Account is locked for now" }),
    ).toBe(true);
    expect(isLoginLockoutResponse(401, { message: "Invalid password" })).toBe(
      false,
    );
  });

  it("parses minute and second lockout durations", () => {
    expect(
      parseLoginLockoutUntil(423, {
        message: "Try again in 2 minute(s)",
      }),
    ).toBe(Date.now() + 120_000);

    expect(
      parseLoginLockoutUntil(423, {
        message: "Try again in 30 second(s)",
      }),
    ).toBe(Date.now() + 30_000);
  });

  it("falls back to the default duration and formats messages", () => {
    const fallbackUntil = parseLoginLockoutUntil(423, {});

    expect(fallbackUntil).toBe(Date.now() + 15 * 60_000);
    expect(formatLoginLockoutMessage(Date.now() + 60_000)).toContain(
      "Try again in 1 minute(s).",
    );
    expect(formatLoginLockoutMessage(Date.now() - 1)).toBe(
      "Your account lockout has expired. Please try signing in again.",
    );
  });
});
