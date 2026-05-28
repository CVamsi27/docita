import { describe, expect, it } from "vitest";
import {
  ACCESS_TOKEN_MAX_AGE_MS,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  REFRESH_TOKEN_MAX_AGE_MS,
} from "./session-semantics.js";

describe("session-semantics", () => {
  it("exports stable auth timing and CSRF contract constants", () => {
    expect(ACCESS_TOKEN_MAX_AGE_MS).toBe(15 * 60 * 1000);
    expect(REFRESH_TOKEN_MAX_AGE_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(CSRF_COOKIE_NAME).toBe("XSRF-TOKEN");
    expect(CSRF_HEADER_NAME).toBe("X-XSRF-TOKEN");
  });
});
