import { describe, expect, it } from "vitest";
import { resolveInternalApiUrl } from "./api-config";

describe("resolveInternalApiUrl", () => {
  it("keeps absolute API URLs unchanged except trailing slash", () => {
    expect(resolveInternalApiUrl("https://api.docita.work/api/v1/")).toBe(
      "https://api.docita.work/api/v1",
    );
  });

  it("resolves same-origin API paths against the runtime origin", () => {
    expect(
      resolveInternalApiUrl("/api/v1", "https://internal.docita.work"),
    ).toBe("https://internal.docita.work/api/v1");
  });

  it("leaves relative API paths unchanged when no origin is available", () => {
    expect(resolveInternalApiUrl("/api/v1", "")).toBe("/api/v1");
  });
});
