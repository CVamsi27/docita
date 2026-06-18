import { describe, expect, it } from "vitest";
import {
  resolveInternalApiProxyBaseUrl,
  shouldProxyInternalApiRequest,
} from "./internal-api-proxy";

describe("internal API proxy routing", () => {
  it("proxies production internal same-origin API requests without runtime env", () => {
    expect(shouldProxyInternalApiRequest("internal.docita.work", {})).toBe(
      true,
    );
    expect(resolveInternalApiProxyBaseUrl("internal.docita.work", {})).toBe(
      "https://api.docita.work/api/v1",
    );
  });

  it("proxies staging internal same-origin API requests without runtime env", () => {
    expect(
      shouldProxyInternalApiRequest("staging-internal.docita.work", {}),
    ).toBe(true);
    expect(
      resolveInternalApiProxyBaseUrl("staging-internal.docita.work", {}),
    ).toBe("https://staging-api.docita.work/api/v1");
  });

  it("uses configured API proxy targets before host fallbacks", () => {
    const env = { API_PROXY_TARGET: "https://example.test" };

    expect(shouldProxyInternalApiRequest("localhost", env)).toBe(true);
    expect(resolveInternalApiProxyBaseUrl("localhost", env)).toBe(
      "https://example.test/api/v1",
    );
  });
});
