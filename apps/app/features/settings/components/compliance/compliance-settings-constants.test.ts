import { describe, expect, it } from "vitest";
import {
  isDsrOverdue,
  sortDsrOverdueFirst,
} from "./compliance-settings-constants";

const NOW = new Date("2026-06-10T12:00:00.000Z");
const PAST = "2026-06-01T00:00:00.000Z";
const FUTURE = "2026-07-01T00:00:00.000Z";

describe("isDsrOverdue", () => {
  it("is true for an open request past its due date", () => {
    expect(isDsrOverdue({ status: "OPEN", dueAt: PAST }, NOW)).toBe(true);
    expect(isDsrOverdue({ status: "IN_REVIEW", dueAt: PAST }, NOW)).toBe(true);
  });

  it("is false when the due date is in the future", () => {
    expect(isDsrOverdue({ status: "OPEN", dueAt: FUTURE }, NOW)).toBe(false);
  });

  it("is false for resolved requests even past due", () => {
    expect(isDsrOverdue({ status: "FULFILLED", dueAt: PAST }, NOW)).toBe(false);
    expect(isDsrOverdue({ status: "REJECTED", dueAt: PAST }, NOW)).toBe(false);
  });

  it("is false when no due date is set", () => {
    expect(isDsrOverdue({ status: "OPEN", dueAt: null }, NOW)).toBe(false);
  });
});

describe("sortDsrOverdueFirst", () => {
  it("moves overdue requests to the front, keeping relative order otherwise", () => {
    const requests = [
      { id: "a", status: "OPEN", dueAt: FUTURE },
      { id: "b", status: "OPEN", dueAt: PAST },
      { id: "c", status: "FULFILLED", dueAt: PAST },
      { id: "d", status: "IN_REVIEW", dueAt: PAST },
    ] as const;

    const sorted = sortDsrOverdueFirst([...requests], NOW);
    expect(sorted.map((r) => r.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("does not mutate the input array", () => {
    const requests = [
      { id: "a", status: "OPEN", dueAt: FUTURE },
      { id: "b", status: "OPEN", dueAt: PAST },
    ] as const;
    const input = [...requests];
    sortDsrOverdueFirst(input, NOW);
    expect(input.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
