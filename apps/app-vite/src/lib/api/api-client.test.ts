import { describe, it, expect, vi, beforeEach } from "vitest";

import { getApiBaseUrl, apiPath, getAuthHeaders, handleResponse } from "./api-client";
import { ApiError } from "@/lib/errors";

// Mock the session module so getAuthHeaders doesn't need a real session
vi.mock("@/lib/auth/session", () => ({
  appSession: {
    getToken: vi.fn(),
    getCsrfToken: vi.fn(),
  },
}));

import { appSession } from "@/lib/auth/session";

const mockedSession = vi.mocked(appSession);

// In jsdom, window.location.origin = "http://localhost:3000" and the API
// URL resolver prepends the origin to relative paths via resolveApiUrl().
const TEST_BASE = "http://localhost:3000/api/v1";

// ---------------------------------------------------------------------------
// getApiBaseUrl — delegates to getAppApiUrl which reads VITE_API_URL
// ---------------------------------------------------------------------------
describe("getApiBaseUrl", () => {
  it("returns the API base URL (including origin via resolveApiUrl)", () => {
    const url = getApiBaseUrl();
    expect(url).toBe(TEST_BASE);
  });

  it("returns a string", () => {
    expect(typeof getApiBaseUrl()).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// apiPath — base URL prepending
// ---------------------------------------------------------------------------
describe("apiPath", () => {
  it("prepends the base API URL to paths starting with /", () => {
    const result = apiPath("/patients");
    expect(result).toBe(`${TEST_BASE}/patients`);
  });

  it("prepends the base API URL to paths without leading /", () => {
    const result = apiPath("patients");
    expect(result).toBe(`${TEST_BASE}/patients`);
  });

  it("handles nested paths correctly", () => {
    const result = apiPath("/patients/abc-123");
    expect(result).toBe(`${TEST_BASE}/patients/abc-123`);
  });

  it("handles paths with query parameters", () => {
    const result = apiPath("/patients?q=search&page=1");
    expect(result).toBe(`${TEST_BASE}/patients?q=search&page=1`);
  });

  it("returns just the base for empty path", () => {
    const result = apiPath("");
    expect(result).toBe(`${TEST_BASE}/`);
  });
});

// ---------------------------------------------------------------------------
// getAuthHeaders — token / CSRF header extraction
// ---------------------------------------------------------------------------
describe("getAuthHeaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Authorization and CSRF headers when both tokens exist", () => {
    mockedSession.getToken.mockReturnValue("test-jwt-token");
    mockedSession.getCsrfToken.mockReturnValue("test-csrf-value");

    const headers = getAuthHeaders();
    expect(headers).toEqual({
      Authorization: "Bearer test-jwt-token",
      "x-xsrf-token": "test-csrf-value",
    });
  });

  it("excludes Authorization header when no token is available", () => {
    mockedSession.getToken.mockReturnValue(null);
    mockedSession.getCsrfToken.mockReturnValue("csrf-only");

    const headers = getAuthHeaders();
    expect(headers["Authorization"]).toBeUndefined();
    expect(headers["x-xsrf-token"]).toBe("csrf-only");
  });

  it("excludes CSRF header when no CSRF token is available", () => {
    mockedSession.getToken.mockReturnValue("token-only");
    mockedSession.getCsrfToken.mockReturnValue(null);

    const headers = getAuthHeaders();
    expect(headers["Authorization"]).toBe("Bearer token-only");
    expect(headers["x-xsrf-token"]).toBeUndefined();
  });

  it("returns empty object when no tokens are available", () => {
    mockedSession.getToken.mockReturnValue(null);
    mockedSession.getCsrfToken.mockReturnValue(null);

    const headers = getAuthHeaders();
    expect(headers).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// handleResponse — JSON parsing + error throwing
// ---------------------------------------------------------------------------
describe("handleResponse", () => {
  it("parses a successful JSON response", async () => {
    const response = new Response(JSON.stringify({ id: 1, name: "Test" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const result = await handleResponse<{ id: number; name: string }>(response);
    expect(result).toEqual({ id: 1, name: "Test" });
  });

  it("parses an empty successful response", async () => {
    const response = new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const result = await handleResponse<Record<string, never>>(response);
    expect(result).toEqual({});
  });

  it("throws ApiError with message from response body on 4xx", async () => {
    const response = new Response(
      JSON.stringify({ message: "Patient not found", code: "NOT_FOUND" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );

    let thrown: unknown = undefined;
    try {
      await handleResponse(response);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    if (thrown instanceof ApiError) {
      expect(thrown.message).toContain("Patient not found");
      expect(thrown.statusCode).toBe(404);
      expect(thrown.code).toBe("NOT_FOUND");
    }
  });

  it("throws ApiError with status and code from response on 5xx", async () => {
    const response = new Response(
      JSON.stringify({ message: "Internal server error", code: "SERVER_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );

    let thrown: unknown = undefined;
    try {
      await handleResponse(response);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    if (thrown instanceof ApiError) {
      expect(thrown.statusCode).toBe(500);
      expect(thrown.code).toBe("SERVER_ERROR");
    }
  });

  it("throws with fallback message when response body is not JSON and no statusText", async () => {
    const response = new Response("Internal Server Error", { status: 500 });

    let thrown: unknown = undefined;
    try {
      await handleResponse(response);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    if (thrown instanceof ApiError) {
      expect(thrown.statusCode).toBe(500);
      // When body is not JSON and statusText is empty, falls to the generic fallback
      expect(thrown.message).toBe("Request failed with status 500");
    }
  });

  it("includes details from response body", async () => {
    const response = new Response(
      JSON.stringify({
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: { field: "email", reason: "invalid format" },
      }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );

    let thrown: unknown = undefined;
    try {
      await handleResponse(response);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    if (thrown instanceof ApiError) {
      expect(thrown.details).toEqual({
        field: "email",
        reason: "invalid format",
      });
    }
  });

  it("throws with status text when response body is JSON but missing message field", async () => {
    const response = new Response(
      JSON.stringify({ code: "UNKNOWN" }),
      { status: 403, statusText: "Forbidden", headers: { "Content-Type": "application/json" } },
    );

    let thrown: unknown = undefined;
    try {
      await handleResponse(response);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    if (thrown instanceof ApiError) {
      expect(thrown.message).toBe("Forbidden");
    }
  });
});
