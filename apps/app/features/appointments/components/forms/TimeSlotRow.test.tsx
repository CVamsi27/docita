import { screen } from "@testing-library/react";
import { render } from "@/test-utils/render-with-tooltip";
import { describe, expect, it, vi } from "vitest";
import type { Appointment, Patient } from "@workspace/types";
import { TimeSlotRow } from "./TimeSlotRow";

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    canStartConsultation: true,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/appointments",
}));

function createAppointment(
  status: Appointment["status"],
): Appointment & { patient?: Patient } {
  return {
    id: "apt-1",
    patientId: "patient-1",
    doctorId: "doctor-1",
    status,
    type: "follow_up",
    startTime: "2026-04-18T10:00:00.000Z",
    endTime: "2026-04-18T10:30:00.000Z",
    createdAt: "2026-04-18T09:00:00.000Z",
    updatedAt: "2026-04-18T09:00:00.000Z",
    patient: {
      id: "patient-1",
      firstName: "Asha",
      lastName: "Rao",
      dateOfBirth: "1992-01-01",
      gender: "FEMALE",
      phoneNumber: "9999999991",
    },
  } as Appointment & { patient?: Patient };
}

describe("TimeSlotRow", () => {
  it("shows Resume for in-progress appointments", () => {
    render(
      <TimeSlotRow
        appointment={createAppointment("in-progress")}
        checkingIn={null}
        startingConsultationId={null}
        onCheckIn={vi.fn()}
        onStartConsultation={vi.fn()}
        onCancelClick={vi.fn()}
        onNoShowClick={vi.fn()}
        currentUserId="doctor-1"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Resume" }),
    ).toBeInTheDocument();
  });

  it("shows View for no-show appointments", () => {
    render(
      <TimeSlotRow
        appointment={createAppointment("no-show")}
        checkingIn={null}
        startingConsultationId={null}
        onCheckIn={vi.fn()}
        onStartConsultation={vi.fn()}
        onCancelClick={vi.fn()}
        onNoShowClick={vi.fn()}
        currentUserId="doctor-1"
      />,
    );

    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
  });

  it("shows View for completed appointments", () => {
    render(
      <TimeSlotRow
        appointment={createAppointment("completed")}
        checkingIn={null}
        startingConsultationId={null}
        onCheckIn={vi.fn()}
        onStartConsultation={vi.fn()}
        onCancelClick={vi.fn()}
        onNoShowClick={vi.fn()}
        currentUserId="doctor-1"
      />,
    );

    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
  });

  it("renders an actions trigger when onScheduleFollowUp is provided", () => {
    const onScheduleFollowUp = vi.fn();
    render(
      <TimeSlotRow
        appointment={createAppointment("completed")}
        checkingIn={null}
        startingConsultationId={null}
        onCheckIn={vi.fn()}
        onStartConsultation={vi.fn()}
        onCancelClick={vi.fn()}
        onNoShowClick={vi.fn()}
        onScheduleFollowUp={onScheduleFollowUp}
        currentUserId="doctor-1"
      />,
    );

    expect(
      screen.getByRole("button", { name: /more appointment actions/i }),
    ).toBeInTheDocument();
  });
});
