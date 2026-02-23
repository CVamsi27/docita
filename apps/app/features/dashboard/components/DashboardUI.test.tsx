import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardUI } from "./DashboardUI";

vi.mock("@/features/dashboard/components", () => ({
  DashboardHeader: () => <div data-testid="dashboard-header" />,
  DashboardQuickActions: ({ pendingReports }: { pendingReports: number }) => (
    <div data-testid="dashboard-quick-actions">{pendingReports}</div>
  ),
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton" />,
  DashboardStatsGrid: () => <div data-testid="dashboard-stats-grid" />,
  DoctorDashboardCards: () => <div data-testid="doctor-dashboard-cards" />,
  RecentPatients: () => <div data-testid="recent-patients" />,
  TodaySchedule: () => <div data-testid="today-schedule" />,
  DailyProgress: () => <div data-testid="daily-progress" />,
}));

const baseProps = {
  stats: {
    totalPatients: 0,
    todayAppointments: 0,
    activePrescriptions: 0,
    pendingReports: 3,
    newPatientsThisMonth: 0,
  },
  recentPatients: [],
  todayAppointments: [],
  completedToday: 0,
  inProgressToday: 0,
  currentPatient: null,
  nextPatients: [],
  waitingCount: 0,
  isLoading: false,
  canAccess: () => true,
};

describe("DashboardUI", () => {
  it("renders skeleton while loading", () => {
    render(<DashboardUI {...baseProps} isLoading />);

    expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-header")).not.toBeInTheDocument();
  });

  it("renders dashboard sections when not loading", () => {
    render(<DashboardUI {...baseProps} />);

    expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
    expect(screen.getByTestId("doctor-dashboard-cards")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-quick-actions")).toHaveTextContent(
      "3",
    );
    expect(screen.getByTestId("dashboard-stats-grid")).toBeInTheDocument();
    expect(screen.getByTestId("recent-patients")).toBeInTheDocument();
    expect(screen.getByTestId("daily-progress")).toBeInTheDocument();
    expect(screen.getByTestId("today-schedule")).toBeInTheDocument();
  });

  it("hides schedule when calendar slots are not accessible", () => {
    render(<DashboardUI {...baseProps} canAccess={() => false} />);

    expect(screen.queryByTestId("today-schedule")).not.toBeInTheDocument();
    expect(screen.getByTestId("recent-patients")).toBeInTheDocument();
  });
});
