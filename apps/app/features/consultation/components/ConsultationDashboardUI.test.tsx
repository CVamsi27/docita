import { screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@/test-utils/render-with-tooltip";
import { ConsultationDashboardUI } from "./ConsultationDashboardUI";
import type { AppointmentListItem, QueueItem } from "@workspace/data-access";

const mockDashboard = vi.fn();

vi.mock("@/features/consultation/hooks/use-consultation-dashboard", () => ({
  useConsultationDashboard: () => mockDashboard(),
}));

const mockCheckIn = {
  isPending: false,
  mutateAsync: vi.fn(),
};

vi.mock("@workspace/data-access", () => ({
  useCheckInAppointment: () => mockCheckIn,
}));

vi.mock("@/features/appointments/hooks/use-appointment-row-actions", () => ({
  useAppointmentRowActions: () => ({
    onCancelClick: vi.fn(),
    onNoShowClick: vi.fn(),
    handleCancelAppointment: vi.fn(),
    handleNoShowAppointment: vi.fn(),
    isPending: false,
    dialogProps: {
      cancelDialogOpen: false,
      setCancelDialogOpen: vi.fn(),
      noShowDialogOpen: false,
      setNoShowDialogOpen: vi.fn(),
      isPending: false,
      onCancelConfirm: vi.fn(),
      onNoShowConfirm: vi.fn(),
    },
  }),
}));

vi.mock(
  "@/features/appointments/components/dialogs/AppointmentRowActionDialogs",
  () => ({
    AppointmentRowActionDialogs: () => null,
  }),
);

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ canCreateAppointment: true }),
}));

vi.mock("@workspace/data-access", async () => {
  const actual = await vi.importActual<typeof import("@workspace/data-access")>(
    "@workspace/data-access",
  );
  return {
    ...actual,
    useDoctors: () => ({ data: [], isLoading: false }),
  };
});

vi.mock(
  "@/features/appointments/components/dialogs/AddAppointmentDialogContainer",
  () => ({
    AddAppointmentDialogContainer: () => null,
  }),
);

vi.mock("@/lib/errors/user-facing-errors", () => ({
  showUserFacingErrorToast: vi.fn(),
}));

describe("ConsultationDashboardUI", () => {
  beforeEach(() => {
    mockCheckIn.mutateAsync.mockReset();
  });

  it("renders doctor next panel for doctor role", () => {
    mockDashboard.mockReturnValue({
      opdQueueRows: [],
      stats: { scheduledToday: 0, waiting: 0, inProgress: 0, completed: 0 },
      isLoading: false,
      handleStartConsultation: vi.fn(),
      goToConsultationWorkspace: vi.fn(),
      canAccessQueue: true,
      canStartConsultation: true,
      isStartingConsultation: false,
      router: { push: vi.fn() },
      currentUserRole: "DOCTOR",
      todayAppointmentsSorted: [],
      doctorNowNext: { inProgress: [], combinedUpcoming: [], mode: "fcfs" },
      clinicType: "GENERAL",
    });

    render(<ConsultationDashboardUI />);
    expect(screen.getByText(/Next patients/i)).toBeInTheDocument();
  });

  it("renders check-in panel for receptionist role", () => {
    mockDashboard.mockReturnValue({
      opdQueueRows: [],
      stats: { scheduledToday: 1, waiting: 0, inProgress: 0, completed: 0 },
      isLoading: false,
      handleStartConsultation: vi.fn(),
      goToConsultationWorkspace: vi.fn(),
      canAccessQueue: true,
      canStartConsultation: false,
      isStartingConsultation: false,
      router: { push: vi.fn() },
      currentUserRole: "RECEPTIONIST",
      todayAppointmentsSorted: [
        {
          id: "apt-1",
          startTime: "2026-05-05T10:00:00.000Z",
          status: "scheduled",
          patient: { firstName: "Asha", lastName: "Rao" },
        } as unknown as AppointmentListItem,
      ],
      doctorNowNext: { inProgress: [], nextScheduled: [] },
      clinicType: "GENERAL",
    });

    render(<ConsultationDashboardUI />);
    expect(screen.getByRole("button", { name: /Add walk-in/i })).toBeInTheDocument();
  });

  it("renders prep panel for nurse role", () => {
    mockDashboard.mockReturnValue({
      opdQueueRows: [
        {
          id: "q-1",
          appointmentId: "apt-1",
          tokenNumber: 1,
          status: "WAITING",
          patient: { firstName: "Asha", lastName: "Rao" },
        } as unknown as QueueItem,
      ],
      stats: { scheduledToday: 0, waiting: 1, inProgress: 0, completed: 0 },
      isLoading: false,
      handleStartConsultation: vi.fn(),
      goToConsultationWorkspace: vi.fn(),
      canAccessQueue: true,
      canStartConsultation: false,
      isStartingConsultation: false,
      router: { push: vi.fn() },
      currentUserRole: "NURSE",
      todayAppointmentsSorted: [],
      doctorNowNext: { inProgress: [], nextScheduled: [] },
      clinicType: "GENERAL",
    });

    render(<ConsultationDashboardUI />);
    expect(screen.getByText("Prep")).toBeInTheDocument();
    expect(screen.getByText("Ready for vitals")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Record vitals/i })).toBeInTheDocument();
  });
});

