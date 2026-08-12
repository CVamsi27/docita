import { describe, expect, it } from "vitest";
import { APIRequestError, ErrorCodes } from "@workspace/data-access";
import { ApiError } from "@/lib/errors";
import { isSessionRecoveryError } from "./session-recovery";

describe("isSessionRecoveryError", () => {
  it("detects wrapped ApiError auth failures", () => {
    expect(
      isSessionRecoveryError(new ApiError("Unauthorized", 401, "UNAUTHORIZED")),
    ).toBe(true);
  });

  it("detects wrapped ApiError network failures", () => {
    expect(
      isSessionRecoveryError(
        new ApiError("Failed to fetch", 500, ErrorCodes.NETWORK_ERROR),
      ),
    ).toBe(true);
  });

  it("detects APIRequestError network failures", () => {
    expect(
      isSessionRecoveryError(
        new APIRequestError("Failed to fetch", {
          isNetworkError: true,
          code: ErrorCodes.NETWORK_ERROR,
        }),
      ),
    ).toBe(true);
  });

  it("does not treat validation errors as session recovery", () => {
    expect(
      isSessionRecoveryError(new ApiError("Bad request", 400, "VALIDATION_ERROR")),
    ).toBe(false);
  });
});
