import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AppointmentListItem } from "@workspace/data-access";
import { render } from "@/test-utils";
import { DoctorDashboardCards } from "./doctor-dashboard-cards";

const start = vi.fn().mockResolvedValue(undefined);
vi.mock("@/hooks/use-start-consultation-with-toast", () => ({
  useStartConsultationWithToast: () => ({ start, isPending: false }),
}));

const appointment = (
  overrides: Partial<AppointmentListItem> = {},
): AppointmentListItem =>
  ({
    id: "apt-1",
    type: "consultation",
    startTime: "2026-10-02T09:30:00.000Z",
    patient: { firstName: "Asha", lastName: "Rao" },
    ...overrides,
  }) as AppointmentListItem;

describe("DoctorDashboardCards header copy", () => {
  it("states the live consultation once, not twice", () => {
    // Regression: the micro-label and the supporting line below the title both
    // rendered doctorCards.inConsultation, so the same sentence appeared twice
    // in one card.
    render(
      <DoctorDashboardCards
        currentPatient={appointment()}
        nextPatients={[]}
      />,
    );

    expect(screen.getAllByText("In consultation")).toHaveLength(1);
    expect(screen.getByText("Current Patient")).toBeInTheDocument();
  });

  it("guides the next action when no consultation is running", () => {
    // Regression: the header subtitle repeated the queue button's own label,
    // so "Start your next patient" rendered twice in the idle state.
    render(
      <DoctorDashboardCards
        currentPatient={null}
        nextPatients={[appointment({ id: "apt-2" })]}
      />,
    );

    expect(screen.getByText("Doctor queue")).toBeInTheDocument();
    expect(screen.getByText("No Active Session")).toBeInTheDocument();
    expect(screen.getByText("1 patient waiting")).toBeInTheDocument();
    expect(screen.getAllByText("Start your next patient")).toHaveLength(1);
    expect(screen.queryByText("In consultation")).toBeNull();
  });

  it("keeps the state badge alongside the single live-state label", () => {
    render(
      <DoctorDashboardCards
        currentPatient={appointment()}
        nextPatients={[]}
      />,
    );

    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue consultation with Asha Rao/i })).toBeInTheDocument();
  });

  it("offers a labelled start action for the next queued patient", () => {
    render(
      <DoctorDashboardCards
        currentPatient={null}
        nextPatients={[appointment({ id: "apt-2" })]}
      />,
    );

    expect(
      screen.getByRole("button", { name: /start consultation with Asha Rao/i }),
    ).toBeInTheDocument();
  });
});