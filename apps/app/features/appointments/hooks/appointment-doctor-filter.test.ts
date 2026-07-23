import { computeFilteredDoctors, toUnavailableIdSet } from "./appointment-doctor-filter";

describe("toUnavailableIdSet", () => {
  it("creates a set from an array of ids", () => {
    const result = toUnavailableIdSet(["a", "b", "c"]);
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(3);
    expect(result.has("a")).toBe(true);
    expect(result.has("b")).toBe(true);
    expect(result.has("c")).toBe(true);
  });

  it("returns empty set for undefined input", () => {
    const result = toUnavailableIdSet(undefined);
    expect(result.size).toBe(0);
  });

  it("returns empty set for empty array", () => {
    const result = toUnavailableIdSet([]);
    expect(result.size).toBe(0);
  });

  it("deduplicates ids", () => {
    const result = toUnavailableIdSet(["a", "a", "b"]);
    expect(result.size).toBe(2);
  });
});

describe("computeFilteredDoctors", () => {
  const doctors = [
    { id: "doc-1", name: "Dr. Smith" },
    { id: "doc-2", name: "Dr. Jones" },
    { id: "doc-3", name: "Dr. Lee" },
  ];

  it("returns all doctors when unavailable set is empty", () => {
    const result = computeFilteredDoctors(doctors, new Set());
    expect(result).toHaveLength(3);
  });

  it("filters out unavailable doctors", () => {
    const result = computeFilteredDoctors(doctors, new Set(["doc-2"]));
    expect(result).toHaveLength(2);
    expect(result.map((d) => d.id)).toEqual(["doc-1", "doc-3"]);
  });

  it("filters out multiple unavailable doctors", () => {
    const result = computeFilteredDoctors(doctors, new Set(["doc-1", "doc-3"]));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("doc-2");
  });

  it("returns empty array when all doctors are unavailable", () => {
    const result = computeFilteredDoctors(
      doctors,
      new Set(["doc-1", "doc-2", "doc-3"]),
    );
    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty doctors list", () => {
    const result = computeFilteredDoctors([], new Set(["doc-1"]));
    expect(result).toHaveLength(0);
  });

  it("handles unavailable ids that do not match any doctor", () => {
    const result = computeFilteredDoctors(doctors, new Set(["doc-99"]));
    expect(result).toHaveLength(3);
  });

  it("preserves doctor properties", () => {
    const result = computeFilteredDoctors(doctors, new Set(["doc-2"]));
    expect(result[0]).toEqual({ id: "doc-1", name: "Dr. Smith" });
  });
});
