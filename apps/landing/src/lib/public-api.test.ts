import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveApiUrl } from "./public-api";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveApiUrl", () => {
  it("resolves a relative path against the base origin", () => {
    vi.stubEnv("PUBLIC_API_URL", "/api/v1");

    expect(resolveApiUrl("/contact/inquiry", "https://docita.work")).toBe(
      "https://docita.work/api/v1/contact/inquiry",
    );
  });

  it("appends /v1 when PUBLIC_API_URL ends in /api", () => {
    vi.stubEnv("PUBLIC_API_URL", "https://api.docita.work/api");

    expect(resolveApiUrl("/contact/inquiry")).toBe(
      "https://api.docita.work/api/v1/contact/inquiry",
    );
  });

  it("keeps an absolute base URL unchanged and strips its trailing slashes", () => {
    vi.stubEnv("PUBLIC_API_URL", "https://api.docita.work/v1/");

    expect(resolveApiUrl("/contact/inquiry")).toBe(
      "https://api.docita.work/v1/contact/inquiry",
    );
  });

  it("defaults the base origin to the PUBLIC_SITE_URL env when window is unavailable", () => {
    vi.stubEnv("PUBLIC_API_URL", "/api/v1");
    vi.stubEnv("PUBLIC_SITE_URL", "https://landing.docita.work");

    expect(resolveApiUrl("/contact/inquiry")).toBe(
      "https://landing.docita.work/api/v1/contact/inquiry",
    );
  });
});
