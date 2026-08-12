import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  postWebVitalsRum,
  type WebVitalsRumPayload,
} from "./web-vitals";

const PAYLOAD: WebVitalsRumPayload = {
  name: "LCP",
  value: 1234,
  rating: "good",
  page: "/login",
  feature: "clinician-app",
  sessionId: "sess_1",
};

describe("postWebVitalsRum", () => {
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("{}"))));
    // The same-origin proxy base resolves against window.location.origin via
    // buildURL; the node test env has no window, so stub one.
    vi.stubGlobal("window", {
      location: { origin: "http://localhost" },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  });

  it("posts to the monitoring path via sendBeacon when available", async () => {
    const sendBeacon = vi.fn();
    Object.defineProperty(globalThis, "navigator", {
      value: { sendBeacon },
      configurable: true,
    });

    postWebVitalsRum("/api/v1", PAYLOAD);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, body] = sendBeacon.mock.calls[0] as [string, Blob];
    expect(url).toContain("/api/v1/monitoring/web-vitals");
    await expect(body.text()).resolves.toBe(JSON.stringify(PAYLOAD));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to fetch keepalive when sendBeacon is unavailable", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
    });

    postWebVitalsRum("/api/v1", PAYLOAD);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
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

    expect(() => postWebVitalsRum("/api/v1", PAYLOAD)).not.toThrow();
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});
