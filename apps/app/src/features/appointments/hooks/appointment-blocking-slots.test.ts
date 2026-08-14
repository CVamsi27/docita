import { computeBlockingSlotsFromAppointments } from "./appointment-blocking-slots";

describe("computeBlockingSlotsFromAppointments", () => {
  it("maps appointments to blocking slots", () => {
    const appointments = [
      {
        startTime: "2026-07-25T10:00:00Z",
        endTime: "2026-07-25T10:30:00Z",
        status: "COMPLETED",
      },
    ];
    const result = computeBlockingSlotsFromAppointments(appointments);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      startTime: "2026-07-25T10:00:00Z",
      endTime: "2026-07-25T10:30:00Z",
      status: "COMPLETED",
    });
  });

  it("returns empty array for undefined input", () => {
    expect(computeBlockingSlotsFromAppointments(undefined)).toEqual([]);
  });

  it("returns empty array for empty array", () => {
    expect(computeBlockingSlotsFromAppointments([])).toEqual([]);
  });

  it("handles multiple appointments", () => {
    const appointments = [
      { startTime: "2026-07-25T10:00:00Z", endTime: "2026-07-25T10:30:00Z", status: "A" },
      { startTime: "2026-07-25T11:00:00Z", endTime: "2026-07-25T11:30:00Z", status: "B" },
    ];
    const result = computeBlockingSlotsFromAppointments(appointments);
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("A");
    expect(result[1].status).toBe("B");
  });

  it("preserves Date objects", () => {
    const now = new Date();
    const appointments = [{ startTime: now, endTime: now, status: "X" }];
    const result = computeBlockingSlotsFromAppointments(appointments);
    expect(result[0].startTime).toBe(now);
    expect(result[0].endTime).toBe(now);
  });
});
