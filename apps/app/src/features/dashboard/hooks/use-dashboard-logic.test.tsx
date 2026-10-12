import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataAccessProvider } from "@workspace/data-access";
import {
  dashboardStatsSchema,
  listAppointmentsResponseSchema,
} from "@workspace/types";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { isSessionRecoveryError } from "@/lib/auth/session-recovery";
import { useDashboardLogic } from "./use-dashboard-logic";

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ isAdmin: false, isLoading: false, token: "fixture-token" }),
}));
vi.mock("@/lib/stores/permission-store", () => ({
  usePermissionStore: () => ({ canAccess: () => true }),
}));

const STATS = dashboardStatsSchema.parse({
  totalPatients: 1,
  totalDoctors: 1,
  newPatientsThisMonth: 1,
  todayAppointments: 0,
  totalAppointments: 0,
  activePrescriptions: 0,
  uncodedVisits: 0,
  monthlyRevenue: 0,
  recentActivity: [],
  upcomingAppointments: [],
});

function setup(
  options: {
    appointmentError?: Error;
    statsError?: Error;
    malformedAppointments?: boolean;
    patientsError?: Error;
  } = {},
) {
  let appointmentError = options.appointmentError;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const fetcher = vi.fn().mockImplementation(async (endpoint: string) => {
    if (endpoint === "/dashboard/stats") {
      if (options.statsError) throw options.statsError;
      return STATS;
    }
    if (endpoint.startsWith("/appointments?")) {
      if (appointmentError) throw appointmentError;
      if (options.malformedAppointments) return { items: "invalid" };
      return listAppointmentsResponseSchema.parse({
        items: [],
        hasMore: false,
      });
    }
    if (endpoint.startsWith("/patients?")) {
      if (options.patientsError) throw options.patientsError;
      return { items: [], total: 0 };
    }
    throw new Error(`Unexpected fixture endpoint: ${endpoint}`);
  });
  const config = {
    fetcher,
    getClinicId: () => "clinic-fixture",
    getClinicTimezone: () => "Asia/Kolkata",
    isTierFeatureEnabled: () => true,
  };
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataAccessProvider config={config}>{children}</DataAccessProvider>
      </QueryClientProvider>
    );
  }
  const hook = renderHook(useDashboardLogic, { wrapper: Wrapper });
  return {
    ...hook,
    restoreAppointments: () => {
      appointmentError = undefined;
    },
  };
}

describe("Today primary query recovery", () => {
  it("reports unavailable appointments instead of a healthy empty schedule, then recovers on retry", async () => {
    const error = new Error("Schedule temporarily unavailable");
    const { result, restoreAppointments } = setup({ appointmentError: error });
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));
    expect(result.current.state.isError).toBe(true);
    expect(result.current.state.statsError).toBe(error);
    restoreAppointments();
    await act(async () => {
      await result.current.state.refetchAll();
    });
    await waitFor(() => expect(result.current.state.isError).toBe(false));
    expect(result.current.state.statsError).toBeNull();
    expect(result.current.state.todayAppointments).toEqual([]);
  });

  it("rejects malformed appointment data through the actual shared schema", async () => {
    const { result } = setup({ malformedAppointments: true });
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));
    expect(result.current.state.isError).toBe(true);
    expect(result.current.state.statsError).toBeInstanceOf(Error);
  });

  it("exposes appointment authentication failures to existing session recovery", async () => {
    const error = Object.assign(new Error("Session expired"), { status: 401 });
    const { result } = setup({ appointmentError: error });
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));
    expect(result.current.state.statsError).toBe(error);
    expect(isSessionRecoveryError(result.current.state.statsError)).toBe(true);
  });

  it("preserves stats errors", async () => {
    const error = new Error("Stats unavailable");
    const { result } = setup({ statsError: error });
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));
    expect(result.current.state.isError).toBe(true);
    expect(result.current.state.statsError).toBe(error);
  });

  it("keeps a successfully empty schedule healthy", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));
    expect(result.current.state.isError).toBe(false);
    expect(result.current.state.todayAppointments).toEqual([]);
  });

  it("does not block the primary schedule on an optional recent-patients failure", async () => {
    const { result } = setup({
      patientsError: new Error("Optional list unavailable"),
    });
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));
    expect(result.current.state.isError).toBe(false);
  });
});
