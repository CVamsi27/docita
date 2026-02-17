import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/dashboard", () => ({
  DashboardPageContainer: () => <div data-testid="dashboard-page-container">Dashboard Container</div>,
}));

import SuperAdminDashboard from "./page";

describe("admin dashboard page", () => {
  it("renders DashboardPageContainer", () => {
    render(<SuperAdminDashboard />);

    expect(screen.getByTestId("dashboard-page-container")).toBeInTheDocument();
  });
});
