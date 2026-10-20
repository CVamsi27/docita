import { describe, expect, it } from "vitest";
import type { AppointmentListItem } from "@workspace/data-access";
import {
  appointmentStatusSchema,
  type AppointmentStatus,
} from "@workspace/types";
import { computeAppointmentSummary } from "./appointments-page-helpers";

const item = (status: AppointmentStatus, id = status): AppointmentListItem =>
  ({ id, status }) as AppointmentListItem;

describe("computeAppointmentSummary", () => {
  it("reports an empty summary for no appointments", () => {
    expect(computeAppointmentSummary([])).toEqual({
      total: 0,
      breakdown: [],
    });
  });

  it("counts each status and hides zero-count rows", () => {
    const summary = computeAppointmentSummary([
      item("scheduled", "a"),
      item("scheduled", "b"),
      item("completed", "c"),
    ]);

    expect(summary.total).toBe(3);
    expect(summary.breakdown).toEqual([
      { appointmentStatus: "scheduled", value: 2, tone: "scheduled" },
      { appointmentStatus: "completed", value: 1, tone: "completed" },
    ]);
  });

  it("surfaces cancelled and no-show rows instead of dropping them", () => {
    // Regression: a hand-written five-status list counted these in `total`
    // with no row to explain them, so the rows summed to less than the count.
    const summary = computeAppointmentSummary([
      item("scheduled", "a"),
      item("cancelled", "b"),
      item("no-show", "c"),
    ]);

    expect(summary.total).toBe(3);
    expect(summary.breakdown.map((row) => row.appointmentStatus)).toEqual([
      "scheduled",
      "cancelled",
      "no-show",
    ]);
    expect(
      summary.breakdown.reduce((sum, row) => sum + row.value, 0),
    ).toBe(summary.total);
  });

  it("keeps every status in the domain accounted for", () => {
    const summary = computeAppointmentSummary(
      appointmentStatusSchema.options.map((status) => item(status)),
    );

    expect(summary.total).toBe(appointmentStatusSchema.options.length);
    expect(summary.breakdown.map((row) => row.appointmentStatus)).toEqual(
      appointmentStatusSchema.options,
    );
    expect(
      summary.breakdown.reduce((sum, row) => sum + row.value, 0),
    ).toBe(summary.total);
  });

  it("gives every status a distinct badge tone", () => {
    const summary = computeAppointmentSummary(
      appointmentStatusSchema.options.map((status) => item(status)),
    );

    const tones = summary.breakdown.map((row) => row.tone);
    expect(tones).toHaveLength(appointmentStatusSchema.options.length);
    expect(new Set(tones).size).toBe(tones.length);
  });
});