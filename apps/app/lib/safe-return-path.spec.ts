import { beforeEach, describe, expect, it } from "vitest";
import { APP_REDIRECT_AFTER_LOGIN_KEY } from "./session";
import {
  persistReturnPathBeforeLogin,
  sanitizeAppReturnPath,
} from "./safe-return-path";

describe("sanitizeAppReturnPath", () => {
  it("accepts internal paths with query strings", () => {
    expect(sanitizeAppReturnPath("/patients?tab=active")).toBe(
      "/patients?tab=active",
    );
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(sanitizeAppReturnPath("//evil.com")).toBeNull();
    expect(sanitizeAppReturnPath("https://evil.com")).toBeNull();
    expect(sanitizeAppReturnPath("/\\evil")).toBeNull();
  });

  it("rejects auth shell destinations", () => {
    expect(sanitizeAppReturnPath("/login")).toBeNull();
    expect(sanitizeAppReturnPath("/login?next=/today")).toBeNull();
    expect(sanitizeAppReturnPath("/register")).toBeNull();
    expect(sanitizeAppReturnPath("/portal/login")).toBeNull();
  });

  it("rejects empty and non-path values", () => {
    expect(sanitizeAppReturnPath(null)).toBeNull();
    expect(sanitizeAppReturnPath("")).toBeNull();
    expect(sanitizeAppReturnPath("today")).toBeNull();
  });
});

describe("persistReturnPathBeforeLogin", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("keeps the first captured destination when the URL changes before login", () => {
    history.pushState({}, "", "/deep/page?q=1");
    persistReturnPathBeforeLogin();
    expect(sessionStorage.getItem(APP_REDIRECT_AFTER_LOGIN_KEY)).toBe(
      "/deep/page?q=1",
    );

    history.pushState({}, "", "/today");
    persistReturnPathBeforeLogin();
    expect(sessionStorage.getItem(APP_REDIRECT_AFTER_LOGIN_KEY)).toBe(
      "/deep/page?q=1",
    );
  });

  it("replaces an invalid stored value with a valid current path", () => {
    sessionStorage.setItem(APP_REDIRECT_AFTER_LOGIN_KEY, "//evil");
    history.pushState({}, "", "/patients");
    persistReturnPathBeforeLogin();
    expect(sessionStorage.getItem(APP_REDIRECT_AFTER_LOGIN_KEY)).toBe(
      "/patients",
    );
  });
});
