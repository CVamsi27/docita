import { afterEach, describe, expect, it } from "vitest";
import {
  consumeE2EAccessToken,
  E2E_ACCESS_TOKEN_SESSION_KEY,
} from "./e2e-session-token";

describe("consumeE2EAccessToken", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("returns and removes a one-shot token from sessionStorage", () => {
    sessionStorage.setItem(E2E_ACCESS_TOKEN_SESSION_KEY, "e2e-token");

    expect(consumeE2EAccessToken()).toBe("e2e-token");
    expect(sessionStorage.getItem(E2E_ACCESS_TOKEN_SESSION_KEY)).toBeNull();
    expect(consumeE2EAccessToken()).toBeNull();
  });
});
