import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render-with-tooltip";
import {
  AppointmentRowActionsMenu,
  getAppointmentRowActionVisibility,
} from "./AppointmentRowActionsMenu";

describe("getAppointmentRowActionVisibility", () => {
  it("shows all four items for a scheduled appointment with a patient and follow-up handler", () => {
    expect(
      getAppointmentRowActionVisibility({
        appointmentId: "apt-1",
        patientId: "patient-1",
        status: "scheduled",
        hasScheduleFollowUp: true,
      }),
    ).toEqual({
      showViewPatient: true,
      showFollowUp: true,
      showCancel: true,
      showNoShow: true,
      hasAnyAction: true,
    });
  });

  it("hides View Patient and Schedule follow-up when there is no patientId", () => {
    const visibility = getAppointmentRowActionVisibility({
      appointmentId: "apt-1",
      patientId: null,
      status: "scheduled",
      hasScheduleFollowUp: true,
    });
    expect(visibility.showViewPatient).toBe(false);
    expect(visibility.showFollowUp).toBe(false);
    expect(visibility.showCancel).toBe(true);
    expect(visibility.showNoShow).toBe(true);
  });

  it("hides Mark as No Show for in-progress appointments but keeps Cancel", () => {
    const visibility = getAppointmentRowActionVisibility({
      appointmentId: "apt-1",
      patientId: "patient-1",
      status: "in-progress",
      hasScheduleFollowUp: true,
    });
    expect(visibility.showNoShow).toBe(false);
    expect(visibility.showCancel).toBe(true);
  });

  it("hides Cancel and Mark as No Show for completed appointments", () => {
    const visibility = getAppointmentRowActionVisibility({
      appointmentId: "apt-1",
      patientId: "patient-1",
      status: "completed",
      hasScheduleFollowUp: true,
    });
    expect(visibility.showCancel).toBe(false);
    expect(visibility.showNoShow).toBe(false);
    expect(visibility.showViewPatient).toBe(true);
    expect(visibility.showFollowUp).toBe(true);
  });

  it("hides Cancel and Mark as No Show for cancelled and no-show statuses", () => {
    for (const status of ["cancelled", "canceled", "no-show"]) {
      const visibility = getAppointmentRowActionVisibility({
        appointmentId: "apt-1",
        patientId: "patient-1",
        status,
        hasScheduleFollowUp: true,
      });
      expect(visibility.showCancel).toBe(false);
      expect(visibility.showNoShow).toBe(false);
    }
  });

  it("hides Cancel and Mark as No Show when there is no appointmentId", () => {
    const visibility = getAppointmentRowActionVisibility({
      appointmentId: null,
      patientId: "patient-1",
      status: "scheduled",
      hasScheduleFollowUp: true,
    });
    expect(visibility.showCancel).toBe(false);
    expect(visibility.showNoShow).toBe(false);
  });

  it("hides Schedule follow-up when no handler is provided", () => {
    const visibility = getAppointmentRowActionVisibility({
      appointmentId: "apt-1",
      patientId: "patient-1",
      status: "scheduled",
      hasScheduleFollowUp: false,
    });
    expect(visibility.showFollowUp).toBe(false);
    expect(visibility.showViewPatient).toBe(true);
  });

  it("reports hasAnyAction false when nothing should render", () => {
    expect(
      getAppointmentRowActionVisibility({
        appointmentId: null,
        patientId: null,
        status: "completed",
        hasScheduleFollowUp: true,
      }).hasAnyAction,
    ).toBe(false);
  });
});

describe("AppointmentRowActionsMenu", () => {
  it("renders the trigger when at least one action applies", () => {
    render(
      <AppointmentRowActionsMenu
        appointmentId="apt-1"
        patientId="patient-1"
        status="scheduled"
        onCancelClick={vi.fn()}
        onNoShowClick={vi.fn()}
        onScheduleFollowUp={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /more appointment actions/i }),
    ).toBeInTheDocument();
  });

  it("returns null when no action applies", () => {
    const { container } = render(
      <AppointmentRowActionsMenu
        appointmentId={null}
        patientId={null}
        status="completed"
        onCancelClick={vi.fn()}
        onNoShowClick={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
