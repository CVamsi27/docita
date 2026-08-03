import { describe, expect, it } from "vitest";
import {
  buildConsultationHeaderDisplay,
  CONSULTATION_STATUS_STYLES,
} from "./consultation-page-header-helpers";

describe("buildConsultationHeaderDisplay", () => {
  it("maps known appointment statuses to their badge style", () => {
    expect(
      buildConsultationHeaderDisplay({
        patientName: "Asha Rao",
        appointmentStatus: "in-progress",
        appointmentType: "follow-up",
        readOnly: false,
      }).statusStyle,
    ).toBe(CONSULTATION_STATUS_STYLES.in_progress);
  });

  it("normalizes kebab-case statuses to underscore keys", () => {
    const display = buildConsultationHeaderDisplay({
      patientName: "Asha Rao",
      appointmentStatus: "no-show",
      appointmentType: undefined,
      readOnly: false,
    });
    expect(display.statusKey).toBe("no_show");
    expect(display.statusStyle).toBe(CONSULTATION_STATUS_STYLES.no_show);
  });

  it("falls back to a neutral style for unknown statuses", () => {
    const display = buildConsultationHeaderDisplay({
      patientName: "Asha Rao",
      appointmentStatus: "rescheduled",
      appointmentType: undefined,
      readOnly: false,
    });
    expect(display.statusStyle).toBe(
      "bg-muted/50 text-muted-foreground border-muted",
    );
  });

  it("appends the view-only suffix when readOnly", () => {
    const display = buildConsultationHeaderDisplay({
      patientName: "Asha Rao",
      appointmentStatus: "in-progress",
      appointmentType: "consultation",
      readOnly: true,
    });
    expect(display.statusLabel).toContain("View only");
    expect(display.statusLabel).toContain("In Progress");
  });

  it("omits the suffix when not readOnly", () => {
    const display = buildConsultationHeaderDisplay({
      patientName: "Asha Rao",
      appointmentStatus: "completed",
      appointmentType: undefined,
      readOnly: false,
    });
    expect(display.statusLabel).toBe("Completed");
  });

  it("derives initials from first and last name", () => {
    const display = buildConsultationHeaderDisplay({
      patientName: "Asha Rao",
      appointmentStatus: undefined,
      appointmentType: undefined,
      readOnly: false,
    });
    expect(display.initials).toBe("AR");
  });

  it("falls back to first-name initial when there is no last name", () => {
    const display = buildConsultationHeaderDisplay({
      patientName: "Madonna",
      appointmentStatus: undefined,
      appointmentType: undefined,
      readOnly: false,
    });
    expect(display.initials).toBe("M");
  });
});
