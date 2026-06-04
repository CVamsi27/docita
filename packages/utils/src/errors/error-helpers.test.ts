import { describe, expect, it } from "vitest";
import {
  getErrorMessage,
  isErrorWithMessage,
  toErrorWithMessage,
} from "./error-helpers.js";

describe("error helpers", () => {
  it("narrows error-like objects with string messages", () => {
    expect(isErrorWithMessage({ message: "failed" })).toBe(true);
    expect(isErrorWithMessage({ message: 500 })).toBe(false);
    expect(isErrorWithMessage(null)).toBe(false);
  });

  it("preserves useful error metadata and stringifies non-error values", () => {
    const error = new Error("network failed") as Error & { code: string };
    error.code = "ETIMEDOUT";

    expect(toErrorWithMessage(error)).toMatchObject({
      message: "network failed",
      code: "ETIMEDOUT",
      name: "Error",
    });
    expect(getErrorMessage({ retry: false })).toBe('{"retry":false}');
  });
});
