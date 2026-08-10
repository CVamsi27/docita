import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppBaseUrl } from "./get-app-base-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAppBaseUrl", () => {
  it("prefers PUBLIC_APP_URL over the legacy env names", () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.docita.work");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://legacy.example.com");
    vi.stubEnv("APP_URL", "https://oldest.example.com");

    expect(getAppBaseUrl()).toBe("https://app.docita.work");
  });

  it("strips trailing slashes from the configured URL", () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.docita.work///");

    expect(getAppBaseUrl()).toBe("https://app.docita.work");
  });

  it("falls back to the local dev URL when nothing is configured", () => {
    vi.stubEnv("PUBLIC_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("APP_URL", "");

    expect(getAppBaseUrl()).toBe("http://localhost:3000");
  });
});
