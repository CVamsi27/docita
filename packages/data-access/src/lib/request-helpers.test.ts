import { describe, expect, it } from "vitest";
import { dedupeHeaders } from "./request-helpers";

describe("dedupeHeaders", () => {
  it("collapses case-variant duplicate keys to a single canonical header", () => {
    // Mirrors the real bug: a caller sets `X-XSRF-TOKEN` (e.g. buildJsonHeaders)
    // and the api client interceptor sets `x-xsrf-token`. Passed straight to
    // `fetch`, these would combine into `x-xsrf-token: TOKEN, TOKEN` and fail
    // the backend CSRF double-submit check.
    const headers = dedupeHeaders({
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": "TOKEN",
      "x-xsrf-token": "TOKEN",
    });

    expect(headers.get("x-xsrf-token")).toBe("TOKEN");
  });

  it("keeps the last value when keys differ only by case (interceptor wins)", () => {
    // Object key insertion order: the manual (stale) value is added first, the
    // interceptor's freshly-resolved token last. Last-write-wins must keep the
    // interceptor value so the one-shot CSRF self-heal retry can recover.
    const headers = dedupeHeaders({
      "X-XSRF-TOKEN": "STALE",
      "x-xsrf-token": "FRESH",
    });

    expect(headers.get("x-xsrf-token")).toBe("FRESH");
  });

  it("preserves unrelated headers untouched", () => {
    const headers = dedupeHeaders({
      "Content-Type": "application/json",
      Accept: "application/json",
    });

    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("accept")).toBe("application/json");
  });

  it("accepts Headers and entry-array inputs", () => {
    expect(
      dedupeHeaders(new Headers({ "x-xsrf-token": "A" })).get("x-xsrf-token"),
    ).toBe("A");
    expect(
      dedupeHeaders([["x-xsrf-token", "B"]]).get("x-xsrf-token"),
    ).toBe("B");
  });

  it("returns empty headers for undefined input", () => {
    expect(Array.from(dedupeHeaders().entries())).toHaveLength(0);
  });
});
