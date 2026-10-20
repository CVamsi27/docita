import { describe, expect, it } from "vitest";
import {
  buildLandingUpstreamApiUrl,
  createLandingProxyRequestHeaders,
  createLandingProxyResponseHeaders,
} from "./landing-api-proxy";

describe("landing-api-proxy", () => {
  it("builds a query-preserving upstream API URL", () => {
    expect(
      buildLandingUpstreamApiUrl("https://api.docita.work/", "v1/contact/inquiry", "https://docita.work/api/v1/contact/inquiry?source=landing"),
    ).toBe("https://api.docita.work/api/v1/contact/inquiry?source=landing");
  });

  it("rejects path traversal segments before URL normalization", () => {
    expect(() =>
      buildLandingUpstreamApiUrl("https://api.docita.work", "v1/public/../contact/inquiry", "https://docita.work/api/v1/contact/inquiry"),
    ).toThrow("Landing proxy path contains a traversal segment");
  });

  it("forwards end-to-end request headers and removes hop-by-hop headers", () => {
    const headers = createLandingProxyRequestHeaders(
      new Headers({ connection: "keep-alive", "content-length": "10", "content-type": "application/json", "x-xsrf-token": "csrf-token" }),
    );
    expect(headers.get("connection")).toBeNull();
    expect(headers.get("content-length")).toBeNull();
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-xsrf-token")).toBe("csrf-token");
  });

  it("keeps same-origin response metadata and strips transport and CORS headers", () => {
    const headers = createLandingProxyResponseHeaders(
      new Headers({ "access-control-allow-origin": "https://api.docita.work", "content-length": "10", "content-type": "application/pdf", location: "/pay/complete" }),
    );
    expect(headers.get("access-control-allow-origin")).toBeNull();
    expect(headers.get("content-length")).toBeNull();
    expect(headers.get("content-type")).toBe("application/pdf");
    expect(headers.get("location")).toBe("/pay/complete");
  });
});
