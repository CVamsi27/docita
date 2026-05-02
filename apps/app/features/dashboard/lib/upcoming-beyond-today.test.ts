import { describe, expect, it } from "vitest";
import { filterUpcomingBeyondToday, startOfTomorrow } from "./upcoming-beyond-today";

describe("filterUpcomingBeyondToday", () => {
  it("excludes appointments before start of tomorrow", () => {
    const tomorrow = startOfTomorrow();
    const todayNoon = new Date(tomorrow);
    todayNoon.setDate(todayNoon.getDate() - 1);
    todayNoon.setHours(12, 0, 0, 0);

    const rows = [
      {
        id: "1",
        startTime: todayNoon,
        endTime: new Date(todayNoon.getTime() + 3600000),
        status: "scheduled",
        type: null,
        patient: { id: "p1", firstName: "A", lastName: "B" },
      },
      {
        id: "2",
        startTime: new Date(tomorrow.getTime() + 10 * 3600000),
        endTime: new Date(tomorrow.getTime() + 11 * 3600000),
        status: "scheduled",
        type: null,
        patient: { id: "p2", firstName: "C", lastName: "D" },
      },
    ];

    const filtered = filterUpcomingBeyondToday(rows);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("2");
  });
});
