import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postWebVitalsRum } from "./web-vitals-payload";

const PAYLOAD = {
  name: "LCP",
  value: 1234,
  rating: "good",
  page: "/login",
  feature: "clinician-app",
  sessionId: "sess_1",
} as const;

describe("postWebVitalsRum", () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("{}"))));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
  });

  it("posts to the same-origin /api/v1 monitoring path via sendBeacon when available", async () => {
    const sendBeacon = vi.fn();
    Object.defineProperty(globalThis, "navigator", {
      value: { sendBeacon },
      configurable: true,
    });

    postWebVitalsRum(PAYLOAD);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, body] = sendBeacon.mock.calls[0] as [string, Blob];
    expect(url).toContain("/api/v1/monitoring/web-vitals");
    await expect(readBlobText(body)).resolves.toBe(JSON.stringify(PAYLOAD));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to fetch keepalive when sendBeacon is unavailable", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
    });

    postWebVitalsRum(PAYLOAD);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/api/v1/monitoring/web-vitals");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(String(init.body))).toEqual(PAYLOAD);
  });

  it("never throws when the fetch fallback fails", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
    });
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));

    expect(() => postWebVitalsRum(PAYLOAD)).not.toThrow();
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

