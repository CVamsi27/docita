import { timelineDateRange } from "./timeline-date-range.helper";

describe("timelineDateRange", () => {
  it("returns empty object when both from and to are undefined", () => {
    expect(timelineDateRange("createdAt")).toEqual({});
  });

  it("returns gte when only from is provided", () => {
    const from = new Date("2026-01-01");
    expect(timelineDateRange("createdAt", from)).toEqual({
      createdAt: { gte: from },
    });
  });

  it("returns lte when only to is provided", () => {
    const to = new Date("2026-12-31");
    expect(timelineDateRange("createdAt", undefined, to)).toEqual({
      createdAt: { lte: to },
    });
  });

  it("returns both gte and lte when both are provided", () => {
    const from = new Date("2026-01-01");
    const to = new Date("2026-12-31");
    expect(timelineDateRange("updatedAt", from, to)).toEqual({
      updatedAt: { gte: from, lte: to },
    });
  });

  it("uses the provided field name as key", () => {
    const from = new Date("2026-06-01");
    expect(timelineDateRange("scheduledTime", from)).toEqual({
      scheduledTime: { gte: from },
    });
  });
});
