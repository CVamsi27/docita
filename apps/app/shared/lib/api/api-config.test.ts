import { describe, expect, it } from "vitest";
import {
  resolveAppApiUrl,
  shouldUseSameOriginAppProxy,
} from "./api-config";

describe("resolveAppApiUrl", () => {
  it("keeps absolute API URLs unchanged except trailing slash", () => {
    expect(resolveAppApiUrl("https://api.docita.work/api/v1/")).toBe(
      "https://api.docita.work/api/v1",
    );
  });

  it("resolves same-origin API paths against the runtime origin", () => {
    expect(resolveAppApiUrl("/api/v1", "https://app.docita.work")).toBe(
      "https://app.docita.work/api/v1",
    );
  });

  it("leaves relative API paths unchanged when no origin is available", () => {
    expect(resolveAppApiUrl("/api/v1", "")).toBe("/api/v1");
  });
});

describe("shouldUseSameOriginAppProxy", () => {
  it("forces the proxy when the build baked in the upstream API origin", () => {
    expect(
      shouldUseSameOriginAppProxy(
        "https://api.docita.work/api/v1",
        "app.docita.work",
      ),
    ).toBe(true);
  });

  it("does not rewrite when already using a relative proxy path", () => {
    expect(shouldUseSameOriginAppProxy("/api/v1", "app.docita.work")).toBe(
      false,
    );
  });

  it("does not rewrite when running on the API host itself", () => {
    expect(
      shouldUseSameOriginAppProxy(
        "https://api.docita.work/api/v1",
        "api.docita.work",
      ),
    ).toBe(false);
  });
});
