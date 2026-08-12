import { describe, expect, it, vi, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router";
import { render, screen, cleanup } from "@testing-library/react";
import { DataAccessProvider } from "@workspace/data-access";
import { AppointmentsPage } from "./appointments-page";

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ canStartConsultation: true }),
}));

vi.mock("../hooks/use-appointment-notifications", () => ({
  useAppointmentNotifications: () => {},
}));

vi.mock("../components/AppointmentsPageContent", () => ({
  default: () => (
    <div>
      <h1>Appointments</h1>
      <p>Schedule and manage patient appointments</p>
      <button type="button">New appointment</button>
    </div>
  ),
}));

const mockDataConfig = {
  fetcher: vi.fn().mockResolvedValue({ items: [] }),
  getClinicId: () => "clinic-1",
  getClinicTimezone: () => "Asia/Kolkata",
  isTierFeatureEnabled: () => true,
};

afterEach(() => {
  cleanup();
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <HelmetProvider>
      <DataAccessProvider config={mockDataConfig}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>{ui}</MemoryRouter>
        </QueryClientProvider>
      </DataAccessProvider>
    </HelmetProvider>,
  );
}

describe("AppointmentsPage", () => {
  it("renders the page title", () => {
    renderWithProviders(<AppointmentsPage />);
    expect(screen.getByText("Appointments")).toBeInTheDocument();
    expect(
      screen.getByText("Schedule and manage patient appointments"),
    ).toBeInTheDocument();
  });

  it("renders the new appointment button", () => {
    renderWithProviders(<AppointmentsPage />);
    expect(
      screen.getByRole("button", { name: /new appointment/i }),
    ).toBeInTheDocument();
  });
});
