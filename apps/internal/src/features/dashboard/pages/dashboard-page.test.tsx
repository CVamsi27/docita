import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test-utils";
import { DashboardPage } from "./dashboard-page";

const apiGet = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/api-client", () => ({ apiGet }));
vi.mock("../components/create-clinic-dialog", () => ({
  CreateClinicDialog: () => null,
}));
vi.mock("../components/edit-clinic-dialog", () => ({
  EditClinicDialog: () => null,
}));
const clinic = (id: string, name: string) => ({
  id,
  name,
  email: `${id}@example.test`,
  phone: "+919000000001",
  address: "Fixture address",
  tier: "STARTER",
  active: true,
  subscriptionStatus: "ACTIVE",
  createdAt: "2026-10-08T00:00:00Z",
  type: "GENERAL",
  _count: { users: 3, patients: 7 },
});
const stats = {
  clinics: 3,
  users: 4,
  doctors: 1,
  patients: 7,
  invoices: 2,
  prescriptions: 1,
  trends: {
    clinicsThisMonth: 1,
    usersThisMonth: 1,
    doctorsThisMonth: 1,
    patientsThisMonth: 1,
    invoicesPercentChange: 0,
    prescriptionsPercentChange: 0,
  },
};

beforeEach(() => {
  apiGet.mockReset();
  apiGet.mockImplementation(async (path: string) =>
    path.includes("/stats")
      ? stats
      : path.includes("cursor=")
        ? { items: [clinic("gamma", "Gamma Clinic")], hasMore: false, count: 1 }
        : {
            items: [
              clinic("alpha", "Alpha Clinic"),
              clinic("beta", "Beta Clinic"),
            ],
            nextCursor: "next",
            hasMore: true,
            count: 2,
          },
  );
});

describe("dashboard facility browsing", () => {
  it("renders cursor-wrapped facilities and filters only the loaded page", async () => {
    render(
      <TooltipProvider>
        <DashboardPage />
      </TooltipProvider>,
    );
    expect(await screen.findByText("Alpha Clinic")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search facilities" }),
      { target: { value: "Beta" } },
    );
    expect(screen.queryByText("Alpha Clinic")).not.toBeInTheDocument();
    expect(screen.getByText("Beta Clinic")).toBeInTheDocument();
  });
  it("moves to the next cursor and returns to the prior page", async () => {
    render(
      <TooltipProvider>
        <DashboardPage />
      </TooltipProvider>,
    );
    await screen.findByText("Alpha Clinic");
    fireEvent.click(
      screen.getByRole("button", { name: "Next facilities page" }),
    );
    expect(await screen.findByText("Gamma Clinic")).toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining("cursor=next"));
    fireEvent.click(
      screen.getByRole("button", { name: "Previous facilities page" }),
    );
    expect(await screen.findByText("Alpha Clinic")).toBeInTheDocument();
  });
  it("shows a facility-query error and retries both dashboard queries", async () => {
    apiGet.mockImplementation(async (path: string) => {
      if (path.includes("/stats")) return stats;
      throw new Error("Fixture unavailable");
    });
    render(
      <TooltipProvider>
        <DashboardPage />
      </TooltipProvider>,
    );
    expect(
      await screen.findByText(
        "We could not load this dashboard. Please refresh and try again.",
      ),
    ).toBeInTheDocument();
    apiGet.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() =>
      expect(apiGet).toHaveBeenCalledWith(expect.stringContaining("/clinics")),
    );
    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining("/stats"));
  });
});
