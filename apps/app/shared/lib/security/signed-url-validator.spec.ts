import { describe, it, expect } from "vitest";
import { validateSignedUrl } from "./signed-url-validator";

describe("validateSignedUrl", () => {
  it("rejects empty string", () => {
    expect(validateSignedUrl("").valid).toBe(false);
  });

  it("rejects null", () => {
    expect(validateSignedUrl(null as unknown as string).valid).toBe(false);
  });

  it("rejects javascript: URL", () => {
    expect(validateSignedUrl("javascript:alert(1)").valid).toBe(false);
  });

  it("rejects blob: URL", () => {
    expect(validateSignedUrl("blob:null/uuid").valid).toBe(false);
  });

  it("rejects data: URL", () => {
    expect(validateSignedUrl("data:text/html,<script>alert(1)</script>").valid).toBe(false);
  });

  it("allows same-origin relative URL", () => {
    expect(validateSignedUrl("/api/v1/documents/123").valid).toBe(true);
  });

  it("allows https URL", () => {
    expect(validateSignedUrl("https://example.com/file.pdf").valid).toBe(true);
  });

  it("validates complete signed URL with params", () => {
    const url =
      "https://example.r2.cloudflarestorage.com/bucket/file.pdf" +
      "?X-Amz-Algorithm=AWS4-HMAC-SHA256" +
      "&X-Amz-Credential=key%2F20250101%2Fauto%2Fs3%2Faws4_request" +
      "&X-Amz-Signature=abc123def456";
    expect(validateSignedUrl(url).valid).toBe(true);
  });

  it("rejects signed URL missing credential param", () => {
    const url =
      "https://example.r2.cloudflarestorage.com/bucket/file.pdf" +
      "?X-Amz-Signature=abc123&X-Amz-Algorithm=AWS4-HMAC-SHA256";
    expect(validateSignedUrl(url).valid).toBe(false);
  });

  it("rejects expired signed URL", () => {
    const past = new Date(Date.now() - 120000);
    const dateStr = past
      .toISOString()
      .replace(/[:-]/g, "")
      .replace(/\.\d{3}/, "");
    const url =
      "https://example.r2.cloudflarestorage.com/bucket/file.pdf" +
      `?X-Amz-Algorithm=AWS4-HMAC-SHA256` +
      `&X-Amz-Credential=key%2F20250101%2Fauto%2Fs3%2Faws4_request` +
      `&X-Amz-Signature=abc123` +
      `&X-Amz-Date=${dateStr}` +
      `&X-Amz-Expires=30`; // 30 seconds, but 2 minutes have passed

    const result = validateSignedUrl(url);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("expired");
  });

  it("accepts non-expired signed URL", () => {
    const now = new Date();
    const dateStr = now
      .toISOString()
      .replace(/[:-]/g, "")
      .replace(/\.\d{3}/, "");
    const url =
      "https://example.r2.cloudflarestorage.com/bucket/file.pdf" +
      `?X-Amz-Algorithm=AWS4-HMAC-SHA256` +
      `&X-Amz-Credential=key%2F20250101%2Fauto%2Fs3%2Faws4_request` +
      `&X-Amz-Signature=abc123` +
      `&X-Amz-Date=${dateStr}` +
      `&X-Amz-Expires=3600`; // 1 hour, should be valid

    expect(validateSignedUrl(url).valid).toBe(true);
  });
});
