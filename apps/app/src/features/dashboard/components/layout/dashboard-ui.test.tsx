import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { DataAccessProvider } from "@workspace/data-access";
import { render, screen } from "@testing-library/react";
import { DashboardUI } from "./dashboard-ui";
import type { AppointmentListItem } from "@workspace/data-access";
import type { DashboardPatient, DashboardStats } from "@workspace/types";

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ isAdmin: false, isLoading: false, token: "mock-token", user: { id: "user-1", clinicId: "clinic-1" } }),
  useOptionalAuth: () => ({ isAdmin: false, isLoading: false, token: "mock-token", user: { id: "user-1", clinicId: "clinic-1" } }),
}));

vi.mock("@/lib/stores/permission-store", () => ({
  usePermissionStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const store = { canAccess: vi.fn().mockReturnValue(true), isFeatureLocked: vi.fn().mockReturnValue(false) };
    return selector ? selector(store as unknown as Record<string, unknown>) : store;
  },
  Feature: {},
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ canStartConsultation: true }),
}));

vi.mock("@/lib/contexts/clinic-context", () => ({
  useClinic: () => ({ clinic: { name: "Test Clinic", slotDuration: 15 } }),
}));

const mockDataConfig = {
  fetcher: vi.fn().mockResolvedValue({ items: [] }),
  getClinicId: () => "clinic-1",
  getClinicTimezone: () => "Asia/Kolkata",
  isTierFeatureEnabled: () => true,
};

const MINIMAL_STATS = {
  totalPatients: 10,
  todayAppointments: 5,
  activePrescriptions: 3,
  uncodedVisits: 1,
  newPatientsThisMonth: 2,
};

const MINIMAL_PROPS = {
  stats: MINIMAL_STATS,
  recentActivity: [] as DashboardStats["recentActivity"],
  upcomingAppointments: [] as DashboardStats["upcomingAppointments"],
  recentPatients: [] as DashboardPatient[],
  todayAppointments: [] as AppointmentListItem[],
  completedToday: 0,
  inProgressToday: 0,
  currentPatient: null,
  nextPatients: [] as AppointmentListItem[],
  waitingCount: 0,
  pendingJoinRequests: 0,
  isLoading: false,
  canAccess: () => true,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <DataAccessProvider config={mockDataConfig}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TooltipProvider>
            {ui}
          </TooltipProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </DataAccessProvider>,
  );
}

describe("DashboardUI", () => {
  it("renders error state when isError is true", () => {
    renderWithProviders(<DashboardUI {...MINIMAL_PROPS} isError onRetry={() => {}} />);
    expect(
      screen.getByText(/We could not load your dashboard/),
    ).toBeInTheDocument();
  });

  it("renders empty state for new clinics", () => {
    renderWithProviders(
      <DashboardUI
        {...MINIMAL_PROPS}
        stats={{
          totalPatients: 0,
          todayAppointments: 0,
          activePrescriptions: 0,
          uncodedVisits: 0,
          newPatientsThisMonth: 0,
        }}
      />,
    );

    expect(screen.getByText("Welcome to Docita")).toBeInTheDocument();
  });

  it("renders content for a loaded dashboard", () => {
    renderWithProviders(<DashboardUI {...MINIMAL_PROPS} />);
    expect(screen.getByText("Queue")).toBeInTheDocument();
  });

  it("renders error retry button when onRetry is provided", () => {
    renderWithProviders(<DashboardUI {...MINIMAL_PROPS} isError onRetry={() => {}} />);
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });
});
