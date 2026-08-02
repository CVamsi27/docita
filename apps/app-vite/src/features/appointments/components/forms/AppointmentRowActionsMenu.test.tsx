import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { renderWithTooltip as render } from "@/test-utils/render-with-tooltip";
import { AppointmentRowActionsMenu, getAppointmentRowActionVisibility } from "./AppointmentRowActionsMenu";

describe("getAppointmentRowActionVisibility", () => {
  it("shows all items for a scheduled appointment with a patient, follow-up, and OPD slip handler", () => {
    expect(
      getAppointmentRowActionVisibility({
        appointmentId: "apt-1",
        patientId: "patient-1",
        status: "scheduled",
        hasScheduleFollowUp: true,
        hasPrintOpdSlip: true,
      }),
    ).toEqual({
      showViewPatient: true,
      showFollowUp: true,
      showPrintOpdSlip: true,
      showCancel: true,
      showNoShow: true,
      hasAnyAction: true,
    });
  });

  it("shows Print OPD prescription only with an appointmentId and a handler", () => {
    expect(
      getAppointmentRowActionVisibility({
        appointmentId: "apt-1",
        patientId: null,
        status: "scheduled",
        hasPrintOpdSlip: true,
      }).showPrintOpdSlip,
    ).toBe(true);

    expect(
      getAppointmentRowActionVisibility({
        appointmentId: null,
        patientId: "patient-1",
        status: "scheduled",
        hasPrintOpdSlip: true,
      }).showPrintOpdSlip,
    ).toBe(false);

    expect(
      getAppointmentRowActionVisibility({
        appointmentId: "apt-1",
        patientId: "patient-1",
        status: "scheduled",
        hasPrintOpdSlip: false,
      }).showPrintOpdSlip,
    ).toBe(false);
  });

  it("shows Print OPD prescription only for scheduled and checked-in statuses", () => {
    for (const status of ["scheduled", "checked-in"]) {
      expect(
        getAppointmentRowActionVisibility({
          appointmentId: "apt-1",
          patientId: "patient-1",
          status,
          hasPrintOpdSlip: true,
        }).showPrintOpdSlip,
      ).toBe(true);
    }

    for (const status of [
      "confirmed",
      "in-progress",
      "completed",
      "no-show",
      "cancelled",
    ]) {
      expect(
        getAppointmentRowActionVisibility({
          appointmentId: "apt-1",
          patientId: "patient-1",
          status,
          hasPrintOpdSlip: true,
        }).showPrintOpdSlip,
      ).toBe(false);
    }
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
    for (const status of ["cancelled", "no-show"]) {
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
      <MemoryRouter>
        <AppointmentRowActionsMenu
          appointmentId="apt-1"
          patientId="patient-1"
          status="scheduled"
          onCancelClick={vi.fn()}
          onNoShowClick={vi.fn()}
          onScheduleFollowUp={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("button", { name: /more appointment actions/i }),
    ).toBeInTheDocument();
  });

  it("returns null when no action applies", () => {
    const { container } = render(
      <MemoryRouter>
        <AppointmentRowActionsMenu
          appointmentId={null}
          patientId={null}
          status="completed"
          onCancelClick={vi.fn()}
          onNoShowClick={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
