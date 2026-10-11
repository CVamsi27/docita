import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test-utils";
import { DashboardPage } from "./dashboard-page";
import { within } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/form/button";

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
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
  }));
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dashboard facility browsing", () => {
  it("renders cursor-wrapped facilities and filters only the loaded page", async () => {
    render(
      <TooltipProvider>
        <DashboardPage />
      </TooltipProvider>,
    );
    expect((await screen.findAllByText("Alpha Clinic"))[0]).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search facilities" }),
      { target: { value: "Beta" } },
    );
    expect(screen.queryAllByText("Alpha Clinic")).toHaveLength(0);
    expect(screen.getAllByText("Beta Clinic")[0]).toBeInTheDocument();
  });
  it("moves to the next cursor and returns to the prior page", async () => {
    render(
      <TooltipProvider>
        <DashboardPage />
      </TooltipProvider>,
    );
    await screen.findAllByText("Alpha Clinic");
    fireEvent.click(
      screen.getByRole("button", { name: "Next facilities page" }),
    );
    expect((await screen.findAllByText("Gamma Clinic"))[0]).toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining("cursor=next"));
    fireEvent.click(
      screen.getByRole("button", { name: "Previous facilities page" }),
    );
    expect((await screen.findAllByText("Alpha Clinic"))[0]).toBeInTheDocument();
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

describe("facility review selection", () => {
  it("distinguishes absent contact and subscription data from zero counts", async () => {
    apiGet.mockImplementation(async (path: string) =>
      path.includes("/stats")
        ? stats
        : {
            items: [
              {
                ...clinic("alpha", "Alpha Clinic"),
                phone: "",
                address: "",
                subscriptionStatus: "",
                _count: { users: 0, patients: 0 },
              },
            ],
            hasMore: false,
            count: 1,
          },
    );
    render(
      <TooltipProvider>
        <DashboardPage />
      </TooltipProvider>,
    );
    fireEvent.click(
      (
        await screen.findAllByRole("button", {
          name: "Review facility: Alpha Clinic",
        })
      )[0]!,
    );
    const review = within(
      screen.getByRole("complementary", { name: "Facility review" }),
    );
    expect(review.getAllByText("Not recorded")).toHaveLength(3);
    expect(review.getAllByText("0", { exact: true })).toHaveLength(2);
  });

  it("clears editable context and announces a record removed by refresh", async () => {
    function RefreshDriver() {
      const queryClient = useQueryClient();
      return (
        <Button
          onClick={() => {
            void queryClient.refetchQueries();
          }}
        >
          Refresh fixture data
        </Button>
      );
    }
    render(
      <TooltipProvider>
        <RefreshDriver />
        <DashboardPage />
      </TooltipProvider>,
    );
    fireEvent.click(
      (
        await screen.findAllByRole("button", {
          name: "Review facility: Alpha Clinic",
        })
      )[0]!,
    );
    expect(
      screen.getByRole("complementary", { name: "Facility review" }),
    ).toHaveTextContent("Alpha Clinic");
    apiGet.mockImplementation(async (path: string) =>
      path.includes("/stats") ? stats : { items: [], hasMore: false, count: 0 },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh fixture data" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "The selected facility is no longer in this view.",
      ),
    );
    expect(
      screen.getByRole("complementary", { name: "Facility review" }),
    ).not.toHaveTextContent("Alpha Clinic");
  });

  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => true,
    }));
  });

  it("reviews a facility without editing and separates access from subscription status", async () => {
    render(
      <TooltipProvider>
        <DashboardPage />
      </TooltipProvider>,
    );
    await screen.findAllByText("Alpha Clinic");
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Review facility: Alpha Clinic",
      })[0]!,
    );
    const review = screen.getByRole("complementary", {
      name: "Facility review",
    });
    expect(review).toHaveTextContent("Alpha Clinic");
    expect(review).toHaveTextContent("Access tier");
    expect(review).toHaveTextContent("Subscription status");
    expect(review).toHaveTextContent("ACTIVE");
    fireEvent.click(
      screen.getByRole("button", { name: "Next facilities page" }),
    );
    await screen.findAllByText("Gamma Clinic");
    expect(
      screen.getByRole("complementary", { name: "Facility review" }),
    ).not.toHaveTextContent("Alpha Clinic");
  });

  it("clears the selected record when it leaves the filtered list", async () => {
    render(
      <TooltipProvider>
        <DashboardPage />
      </TooltipProvider>,
    );
    await screen.findAllByText("Alpha Clinic");
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Review facility: Alpha Clinic",
      })[0]!,
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search facilities" }),
      { target: { value: "Beta" } },
    );
    expect(
      screen.getByRole("complementary", { name: "Facility review" }),
    ).not.toHaveTextContent("Alpha Clinic");
  });
});
