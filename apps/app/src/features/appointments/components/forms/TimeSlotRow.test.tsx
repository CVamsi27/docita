import { screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { AppointmentListItem } from "@workspace/data-access";
import { renderWithTooltip as render } from "@/test-utils/render-with-tooltip";
import { TimeSlotRow } from "./TimeSlotRow";

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    canStartConsultation: true,
  }),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@workspace/data-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/data-access")>();
  return {
    ...actual,
    useResendAppointmentReminder: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
  };
});

vi.mock("@/features/appointments/hooks/use-download-opd-slip", () => ({
  useDownloadOpdSlip: () => ({
    download: vi.fn(),
    downloadingId: null,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function renderRow(node: ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function createAppointment(
  status: AppointmentListItem["status"],
): AppointmentListItem {
  return {
    id: "apt-1",
    clinicId: "clinic-1",
    patientId: "patient-1",
    doctorId: "doctor-1",
    status,
    type: "follow_up",
    startTime: "2026-04-18T10:00:00.000Z",
    endTime: "2026-04-18T10:30:00.000Z",
    createdAt: "2026-04-18T09:00:00.000Z",
    updatedAt: "2026-04-18T09:00:00.000Z",
    version: 1,
    patient: {
      id: "patient-1",
      firstName: "Asha",
      lastName: "Rao",
      phoneNumber: "9999999991",
    },
  };
}

describe("TimeSlotRow", () => {
  it("shows Resume for in-progress appointments", () => {
    renderRow(
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
    renderRow(
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
    renderRow(
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
    renderRow(
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

  it("hides Start for future scheduled appointments (time gate)", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const futureApt = {
      ...createAppointment("scheduled"),
      startTime: future,
      endTime: future,
    };
    renderRow(
      <TimeSlotRow
        appointment={futureApt}
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
      screen.queryByRole("button", { name: "Start" }),
    ).not.toBeInTheDocument();
  });
});
