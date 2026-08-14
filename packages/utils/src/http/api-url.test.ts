import { describe, expect, it } from "vitest";
import {
  resolveApiUrl,
  shouldUseSameOriginApiProxy,
} from "./api-url.js";

describe("resolveApiUrl", () => {
  it("keeps absolute URLs with a trailing slash stripped", () => {
    expect(resolveApiUrl("https://api.docita.work/api/v1/")).toBe(
      "https://api.docita.work/api/v1",
    );
  });

  it("resolves relative values against the runtime origin", () => {
    expect(resolveApiUrl("/api/v1", "https://app.docita.work")).toBe(
      "https://app.docita.work/api/v1",
    );
  });
});

describe("shouldUseSameOriginApiProxy", () => {
  it("uses the proxy on an app origin when configured with an upstream host", () => {
    expect(
      shouldUseSameOriginApiProxy("https://api.docita.work", "app.docita.work"),
    ).toBe(true);
  });

  it("keeps the configured URL when the browser is on the API host itself", () => {
    expect(
      shouldUseSameOriginApiProxy("https://api.docita.work", "api.docita.work"),
    ).toBe(false);
  });

  it("uses the proxy on an app origin when configured with the staging upstream host", () => {
    expect(
      shouldUseSameOriginApiProxy(
        "https://staging-api.docita.work",
        "staging-app.docita.work",
      ),
    ).toBe(true);
  });

  it("keeps the configured URL when the browser is on a staging API host", () => {
    expect(
      shouldUseSameOriginApiProxy(
        "https://api.docita.work",
        "staging-api.docita.work",
      ),
    ).toBe(false);
  });

  it("keeps same-origin relative configured values", () => {
    expect(shouldUseSameOriginApiProxy("/api/v1", "app.docita.work")).toBe(
      false,
    );
  });

  it("returns false for malformed configured values", () => {
    expect(shouldUseSameOriginApiProxy("not a url", "app.docita.work")).toBe(
      false,
    );
  });
});
