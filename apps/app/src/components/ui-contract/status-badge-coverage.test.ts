import { describe, expect, it } from "vitest";
import { getStatusColor } from "@workspace/ui/components/indicators/status-badge";

/**
 * `StatusBadge` normalizes its input to lowercase-kebab and silently falls back
 * to `badge-info` for anything absent from `statusStyles`. Because the fallback
 * is the same tone as `confirmed`, a missing key renders invisibly wrong rather
 * than visibly broken. Three real instances shipped that way:
 *
 *   - `PARTIALLY_PAID` — invoices list, invoice header, desk open-invoices,
 *     daybook ledger, payment activity. A part-paid invoice looked identical to
 *     a confirmed appointment.
 *   - `RESULT_READY` — lab orders table and lab workspace queue, i.e. the state
 *     a clinician most needs to notice, rendered neutral blue.
 *   - `checked-in` — today's schedule.
 *
 * Each expectation below names a tone the enum member must resolve to, rather
 * than asserting only "not the fallback". That distinction matters: `confirmed`
 * *is* `badge-info` by design, so a blanket "must not be badge-info" rule would
 * be wrong and would have hidden the genuine gaps.
 *
 * The enum values are inlined rather than imported from `@workspace/types`
 * because `packages/ui` deliberately has no dependency on that package (0
 * imports across its source, per §15.3). The test lives in `apps/app` so it may
 * depend on the UI primitive without coupling the packages.
 */
const EXPECTED_TONES: ReadonlyArray<readonly [string, string]> = [
  // appointmentStatusSchema
  ["scheduled", "badge-processing"],
  ["confirmed", "badge-info"],
  ["checked-in", "badge-success"],
  ["in-progress", "badge-processing"],
  ["completed", "badge-completed"],
  ["cancelled", "badge-cancelled"],
  ["no-show", "badge-cancelled"],
  // invoiceStatusSchema
  ["PENDING", "badge-pending"],
  ["PAID", "badge-success"],
  ["PARTIALLY_PAID", "badge-warning"],
  // Overdue deliberately shares the cancelled tone (it is an existing
  // decision, not a fallback miss) so it reads as "needs attention" rather
  // than as a distinct state.
  ["OVERDUE", "badge-cancelled"],
  ["CANCELLED", "badge-cancelled"],
  // labTestOrderStatusSchema
  ["ORDERED", "badge-muted"],
  ["SAMPLE_COLLECTED", "badge-processing"],
  ["PENDING", "badge-pending"],
  ["RESULT_READY", "badge-success"],
  ["COMPLETED", "badge-completed"],
  ["CANCELLED", "badge-cancelled"],
  // leaveStatusSchema
  ["APPROVED", "badge-success"],
  ["REJECTED", "badge-danger"],
];

describe("StatusBadge tone coverage", () => {
  it.each(EXPECTED_TONES)("resolves %s to %s", (status, expected) => {
    expect(getStatusColor(status)).toBe(expected);
  });

  it("keeps the three invoice money states mutually distinct", () => {
    const tones = ["PAID", "PARTIALLY_PAID", "OVERDUE"].map(getStatusColor);
    expect(new Set(tones).size).toBe(3);
  });

  it("keeps a ready lab result visually distinct from an ordered one", () => {
    expect(getStatusColor("RESULT_READY")).not.toBe(getStatusColor("ORDERED"));
  });

  it("keeps a checked-in appointment distinct from a scheduled one", () => {
    expect(getStatusColor("checked-in")).not.toBe(
      getStatusColor("scheduled"),
    );
  });

  it("normalizes UPPER_SNAKE, lowercase and kebab spellings alike", () => {
    expect(getStatusColor("COMPLETED")).toBe(getStatusColor("completed"));
    expect(getStatusColor("IN_PROGRESS")).toBe(getStatusColor("in-progress"));
    expect(getStatusColor("PARTIALLY_PAID")).toBe(
      getStatusColor("partially-paid"),
    );
  });

  it("degrades an unrecognized status to the neutral tone", () => {
    expect(getStatusColor("some-unmapped-state")).toBe("badge-info");
    expect(getStatusColor("")).toBe("badge-info");
  });

  it("never returns an empty class for any fed enum value", () => {
    for (const [status] of EXPECTED_TONES) {
      expect(getStatusColor(status)).toBeTruthy();
    }
  });
});