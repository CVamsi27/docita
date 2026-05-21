import { describe, expect, it } from "vitest";
import { normalizeInvoicesListResponse } from "@workspace/data-access";

describe("normalizeInvoicesListResponse", () => {
  it("extracts items from paginated invoice list responses", () => {
    expect(
      normalizeInvoicesListResponse({
        items: [{ id: "a" }],
        hasMore: false,
        count: 1,
      }),
    ).toEqual([{ id: "a" }]);
  });

  it("returns a bare array unchanged", () => {
    expect(normalizeInvoicesListResponse([{ x: 1 }])).toEqual([{ x: 1 }]);
  });

  it("returns an empty array for empty paginated payloads", () => {
    expect(
      normalizeInvoicesListResponse({
        items: [],
        hasMore: false,
        count: 0,
      }),
    ).toEqual([]);
  });

  it("returns an empty array for unexpected shapes", () => {
    expect(normalizeInvoicesListResponse(null)).toEqual([]);
    expect(normalizeInvoicesListResponse({})).toEqual([]);
  });
});
