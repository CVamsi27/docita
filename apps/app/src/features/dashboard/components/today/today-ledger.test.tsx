import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { appointmentListItemResponseSchema } from "@workspace/types";
import { fireEvent, render, screen } from "@/test-utils";
import { within } from "@testing-library/react";
import { TodayLedger } from "@/features/dashboard/components/today/today-ledger";

const active = appointmentListItemResponseSchema.parse({
  id: "active-id",
  clinicId: "clinic",
  patientId: "active-patient",
  doctorId: "doctor",
  startTime: "2026-10-11T08:00:00Z",
  endTime: "2026-10-11T08:30:00Z",
  createdAt: "2026-10-11T07:00:00Z",
  updatedAt: "2026-10-11T08:00:00Z",
  version: 0,
  status: "in-progress",
  patient: { id: "active-patient", firstName: "Maya", lastName: "Rao" },
});
const waiting = appointmentListItemResponseSchema.parse({
  ...active,
  id: "waiting-id",
  patientId: "waiting-patient",
  status: "scheduled",
  startTime: "2026-10-11T08:30:00Z",
  endTime: "2026-10-11T09:00:00Z",
  patient: { id: "waiting-patient", firstName: "Riya", lastName: "Iyer" },
});

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("Today ledger", () => {
  it("previews a waiting appointment without starting or replacing the current visit", () => {
    const handleStartNext = vi.fn();
    render(
      <TodayLedger
        appointments={[active, waiting]}
        currentPatient={active}
        nextPatient={waiting}
        canStartConsultation
        isStarting={false}
        onStartNextPatient={handleStartNext}
      />,
    );
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "View appointment: Riya Iyer",
      })[0]!,
    );
    const preview = screen.getByRole("dialog", {
      name: "Selected appointment",
    });
    expect(within(preview).getByText("Riya Iyer")).toBeInTheDocument();
    expect(handleStartNext).not.toHaveBeenCalled();
    expect(
      within(preview).queryByRole("link", { name: "Continue consultation" }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(preview, { key: "Escape", code: "Escape" });
    expect(
      screen.getByRole("link", { name: "Continue consultation" }),
    ).toHaveAttribute("href", "/consultation/active-id");
  });

  it("retains the one-click start operation and pending lock", () => {
    const handleStartNext = vi.fn();
    const { rerender } = render(
      <TodayLedger
        appointments={[waiting]}
        currentPatient={undefined}
        nextPatient={waiting}
        canStartConsultation
        isStarting={false}
        onStartNextPatient={handleStartNext}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Start next consultation: Riya Iyer",
      }),
    );
    expect(handleStartNext).toHaveBeenCalledTimes(1);
    rerender(
      <TodayLedger
        appointments={[waiting]}
        currentPatient={undefined}
        nextPatient={waiting}
        canStartConsultation
        isStarting
        onStartNextPatient={handleStartNext}
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "Start next consultation: Riya Iyer",
      }),
    ).toBeDisabled();
  });

  it("removes a stale preview when refreshed records no longer include it", () => {
    const props = {
      currentPatient: active,
      nextPatient: waiting,
      canStartConsultation: true,
      isStarting: false,
      onStartNextPatient: vi.fn(),
    };
    const { rerender } = render(
      <TodayLedger {...props} appointments={[active, waiting]} />,
    );
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "View appointment: Riya Iyer",
      })[0]!,
    );
    rerender(<TodayLedger {...props} appointments={[active]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue consultation" }),
    ).toHaveAttribute("href", "/consultation/active-id");
  });

  it("keeps record preview independent of consultation permission", () => {
    render(
      <TodayLedger
        appointments={[active, waiting]}
        currentPatient={active}
        nextPatient={waiting}
        canStartConsultation={false}
        isStarting={false}
        onStartNextPatient={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Start next consultation/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Continue consultation" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "View appointment: Riya Iyer",
      })[0]!,
    );
    expect(
      screen.getByRole("dialog", { name: "Selected appointment" }),
    ).toBeInTheDocument();
  });
});
