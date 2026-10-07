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

  it("renders the out-of-consult CTA with View queue and Start next", () => {
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

  it("keeps one visible label for the start action in both states", () => {
    // Regression: the button read "Start next" while a consult was running and
    // "Next patient" while idle, so the same action changed name with the
    // doctor's state.
    const labelFor = (hasCurrentPatient: boolean) => {
      const { unmount } = render(
        <TodayBottomBarSection
          canStartConsultation
          nextPatient={NEXT_PATIENT}
          hasCurrentPatient={hasCurrentPatient}
          isStarting={false}
          isMutationPending={false}
          onStartNextPatient={vi.fn()}
        />,
      );
      const button = screen.getByRole("button", {
        name: /Start next consultation: Riya Iyer/i,
      });
      const label = button.textContent?.trim();
      unmount();
      return label;
    };

    expect(labelFor(true)).toBe("Start next");
    expect(labelFor(false)).toBe("Start next");
    expect(labelFor(false)).not.toBe("Next patient");
  });

  it.each([true, false])(
    "keeps the visible label inside the accessible name (WCAG 2.5.3, hasCurrentPatient=%s)",
    (hasCurrentPatient) => {
      // Voice control matches on the accessible name, so the words on screen
      // have to appear inside it. The idle state used to show "Next patient"
      // against an accessible name of "Start next consultation: …", which a
      // user could not invoke by saying what they could see.
      render(
        <TodayBottomBarSection
          canStartConsultation
          nextPatient={NEXT_PATIENT}
          hasCurrentPatient={hasCurrentPatient}
          isStarting={false}
          isMutationPending={false}
          onStartNextPatient={vi.fn()}
        />,
      );

      const button = screen.getByRole("button", {
        name: /Start next consultation: Riya Iyer/i,
      });
      const visibleLabel = button.textContent?.trim() ?? "";

      // `getByRole`'s name option matches on the computed accessible name
      // (testing-library runs the real algorithm), so finding the button by
      // its visible wording proves the two match.
      expect(
        screen.getByRole("button", {
          name: new RegExp(visibleLabel.replace(" ", "\\s"), "i"),
        }),
      ).toBe(button);
    },
  );

  it.each([true, false])(
    "exposes the dock as a labelled group (hasCurrentPatient=%s)",
    (hasCurrentPatient) => {
      // `aria-label` on a role-less div is ignored, so the bar needs a role
      // for "Next patient in queue" to reach a screen reader at all.
      render(
        <TodayBottomBarSection
          canStartConsultation
          nextPatient={NEXT_PATIENT}
          hasCurrentPatient={hasCurrentPatient}
          isStarting={false}
          isMutationPending={false}
          onStartNextPatient={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("group", { name: "Next patient in queue" }),
      ).toBeInTheDocument();
    },
  );

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
