import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/test-utils";

import { TodayBottomBarSection } from "./today-page-content-sections";
import type { AppointmentListItem } from "@workspace/data-access";

const NEXT_PATIENT: AppointmentListItem = {
  id: "appt-1",
  startTime: "2026-07-13T11:30:00.000Z",
  patient: {
    id: "patient-1",
    firstName: "Riya",
    lastName: "Iyer",
  },
} as unknown as AppointmentListItem;

describe("TodayBottomBarSection", () => {
  it("renders the in-consult preview with the next patient name and time", () => {
    render(
      <TodayBottomBarSection
        canStartConsultation
        nextPatient={NEXT_PATIENT}
        hasCurrentPatient
        isStarting={false}
        isMutationPending={false}
        onStartNextPatient={vi.fn()}
      />,
    );

    expect(screen.getByText("Next up")).toBeInTheDocument();
    expect(screen.getByText(/Riya Iyer/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Start next consultation/i }),
    ).toBeInTheDocument();
  });

  it("renders the out-of-consult CTA with View queue and Next patient", () => {
    render(
      <TodayBottomBarSection
        canStartConsultation
        nextPatient={NEXT_PATIENT}
        hasCurrentPatient={false}
        isStarting={false}
        isMutationPending={false}
        onStartNextPatient={vi.fn()}
      />,
    );

    expect(screen.getByRole("link", { name: /View queue/i })).toHaveAttribute(
      "href",
      "/consultation",
    );
    expect(
      screen.getByRole("button", { name: /Start next consultation: Riya Iyer/i }),
    ).toBeInTheDocument();
  });

  it("renders nothing when there is no next patient", () => {
    const { container } = render(
      <TodayBottomBarSection
        canStartConsultation
        nextPatient={null}
        hasCurrentPatient={false}
        isStarting={false}
        isMutationPending={false}
        onStartNextPatient={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the user cannot start consultations", () => {
    const { container } = render(
      <TodayBottomBarSection
        canStartConsultation={false}
        nextPatient={NEXT_PATIENT}
        hasCurrentPatient
        isStarting={false}
        isMutationPending={false}
        onStartNextPatient={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("disables the start button while the mutation is in flight", () => {
    render(
      <TodayBottomBarSection
        canStartConsultation
        nextPatient={NEXT_PATIENT}
        hasCurrentPatient
        isStarting={false}
        isMutationPending
        onStartNextPatient={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", {
      name: /Start next consultation/i,
    });
    expect(button).toBeDisabled();
  });
});
