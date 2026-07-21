import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { TodayBottomBarSection } from "./today-page-content-sections";
import type { AppointmentListItem } from "@workspace/data-access";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// English literal map mirroring the Dashboard.today JSON keys the
// component uses, so test assertions on hardcoded English still match
// after the i18n refactor.
const todayCopy: Record<string, string> = {
  askAiOverlayLabel: "on today's workspace",
  askAiAria: "Ask AI about today",
  askAiButton: "Ask AI",
  openQueueButton: "Open queue",
  viewQueueButton: "View queue",
  pageTitle: "Today",
  railHeading: "Sharing and recommendations",
  railLabelTips: "Tips",
  railLabelSharing: "Sharing",
  railLabelBoth: "Sharing & tips",
  bottomBarAria: "Next patient in queue",
  startNextButton: "Start next",
  startingButton: "Starting…",
  nextPatientButton: "Next patient",
  startNextAria: "Start next consultation: {name}",
  nextUpLabel: "Next up",
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string | number>) => {
    const template = todayCopy[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
  },
}));

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
