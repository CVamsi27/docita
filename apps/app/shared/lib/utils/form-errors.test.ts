import { vi } from "vitest";
import {
  formatFieldError,
  hasFieldError,
  getFieldError,
  parseApiError,
} from "./form-errors";

describe("formatFieldError", () => {
  it("returns the string directly for string input", () => {
    expect(formatFieldError("Required field")).toBe("Required field");
  });

  it("returns message from record with message property", () => {
    expect(formatFieldError({ message: "Too short" })).toBe("Too short");
  });

  it("returns fallback for record without message", () => {
    expect(formatFieldError({ code: "INVALID" })).toBe("Please check this field");
  });

  it("returns fallback for null input", () => {
    expect(formatFieldError(null)).toBe("Please enter a valid value");
  });

  it("returns fallback for undefined input", () => {
    expect(formatFieldError(undefined)).toBe("Please enter a valid value");
  });

  it("returns fallback for number input", () => {
    expect(formatFieldError(42)).toBe("Please enter a valid value");
  });

  it("returns fallback for boolean input", () => {
    expect(formatFieldError(true)).toBe("Please enter a valid value");
  });

  it("returns message from record with empty message string", () => {
    const result = formatFieldError({ message: "" });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("hasFieldError", () => {
  it("returns true when field exists in errors", () => {
    expect(hasFieldError({ email: "Required" }, "email")).toBe(true);
  });

  it("returns false when field does not exist", () => {
    expect(hasFieldError({ email: "Required" }, "name")).toBe(false);
  });

  it("returns false for empty errors object", () => {
    expect(hasFieldError({}, "email")).toBe(false);
  });

  it("returns true even when error is an object", () => {
    expect(hasFieldError({ email: { message: "Required" } }, "email")).toBe(true);
  });
});

describe("getFieldError", () => {
  it("returns formatted string error", () => {
    expect(getFieldError({ email: "Required" }, "email")).toBe("Required");
  });

  it("returns empty string when field has no error", () => {
    expect(getFieldError({ email: "Required" }, "name")).toBe("");
  });

  it("returns empty string for empty errors", () => {
    expect(getFieldError({}, "email")).toBe("");
  });

  it("formats object error with message", () => {
    expect(
      getFieldError({ email: { message: "Invalid email" } }, "email"),
    ).toBe("Invalid email");
  });

  it("returns fallback for object error without message", () => {
    const result = getFieldError({ email: { code: "INVALID" } }, "email");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("parseApiError", () => {
  function createMockResponse(body: unknown, ok = false): Response {
    return {
      json: vi.fn().mockResolvedValue(body),
      ok,
      status: ok ? 200 : 400,
    } as unknown as Response;
  }

  it("parses validation errors from response", async () => {
    const response = createMockResponse({
      validationErrors: { email: "Invalid email", name: "Required" },
    });
    const result = await parseApiError(response);
    expect(result.fieldErrors.email).toBe("Invalid email");
    expect(result.fieldErrors.name).toBe("Required");
  });

  it("returns fallback message when no detail is present", async () => {
    const response = createMockResponse({});
    const result = await parseApiError(response);
    expect(result.message).toBeDefined();
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.fieldErrors).toEqual({});
  });

  it("returns fallback when response.json() throws", async () => {
    const response = {
      json: vi.fn().mockRejectedValue(new Error("invalid json")),
    } as unknown as Response;
    const result = await parseApiError(response);
    expect(result.message).toBeDefined();
    expect(result.fieldErrors).toEqual({});
  });

  it("handles response with detail string", async () => {
    const response = createMockResponse({
      detail: "Something went wrong",
    });
    const result = await parseApiError(response);
    expect(result.message).toBeDefined();
  });

  it("handles response with string validation errors", async () => {
    const response = createMockResponse({
      validationErrors: { email: "required" },
    });
    const result = await parseApiError(response);
    expect(result.fieldErrors.email).toBe("required");
  });

  it("handles response with object validation errors", async () => {
    const response = createMockResponse({
      validationErrors: { email: { message: "Invalid" } },
    });
    const result = await parseApiError(response);
    expect(result.fieldErrors.email).toBeDefined();
  });
});
