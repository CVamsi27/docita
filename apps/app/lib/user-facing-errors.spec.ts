import { describe, expect, it, vi } from "vitest";
import {
  getUserFacingErrorMessage,
  isTechnicalErrorMessage,
} from "@workspace/types";
import { showUserFacingErrorToast } from "./user-facing-errors";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("user-facing error messages", () => {
  it.each([
    [400, "Please check the information and try again"],
    [401, "Please sign in again to continue"],
    [403, "You do not have permission to do that"],
    [404, "We could not find what you were looking for"],
    [409, "This information changed. Please refresh and try again."],
    [422, "Please check the highlighted fields and try again"],
    [429, "Too many attempts. Please wait a moment and try again."],
    [500, "We could not complete this right now. Please try again."],
  ])("maps status %s to safe English copy", (status, message) => {
    expect(getUserFacingErrorMessage({ status })).toBe(message);
  });

  it.each([
    [
      { code: "NETWORK_ERROR" },
      "We could not connect right now. Please check your connection and try again.",
    ],
    [{ code: "TIMEOUT" }, "We could not connect right now. Please try again."],
  ])("maps connection errors to safe copy", (error, message) => {
    expect(getUserFacingErrorMessage(error)).toBe(message);
  });

  it("uses nested API bodies without exposing technical internals", () => {
    expect(
      getUserFacingErrorMessage({
        data: {
          message: "PrismaClientKnownRequestError: database constraint failed",
        },
      }),
    ).toBe("We could not complete this right now. Please try again.");
  });

  it("polishes rough but non-technical messages", () => {
    expect(getUserFacingErrorMessage("Failed to load appointments")).toBe(
      "We could not load appointments. Please try again.",
    );
  });

  it.each([
    "HTTP 500 response validation failed",
    "Zod schema parser error at /app/page.tsx",
    "PrismaClientKnownRequestError: database error",
    "TypeError: Cannot read properties of undefined",
    "Something went wrong. Please try again.",
    "token expired for provider",
    "Error: boom\n    at Component (/app/page.tsx:10:5)",
  ])("detects technical messages: %s", (message) => {
    expect(isTechnicalErrorMessage(message)).toBe(true);
    expect(
      getUserFacingErrorMessage(message, {
        fallback: "We could not save your changes. Please try again.",
      }),
    ).toBe("We could not save your changes. Please try again.");
  });

  it("shows safe toast copy for technical API errors", async () => {
    const { toast } = await import("sonner");

    showUserFacingErrorToast(
      { data: { message: "Response validation failed: HTTP 500" } },
      "We could not save your changes. Please try again.",
      "save",
    );

    expect(toast.error).toHaveBeenCalledWith(
      "We could not save your changes. Please try again.",
      { duration: Number.POSITIVE_INFINITY },
    );
  });
});
