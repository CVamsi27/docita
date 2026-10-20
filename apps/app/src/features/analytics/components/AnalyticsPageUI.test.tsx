import { fireEvent, render, screen } from "@/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";
import type { AnalyticsTab } from "@/features/analytics/hooks/use-analytics-logic";
import { AnalyticsPageUI } from "./AnalyticsPageUI";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "page.loadingMessage": "Loading analytics…",
        "page.errorMessage": "Something went wrong",
        "page.title": "Analytics",
        "page.description": "Track your clinic performance",
        "page.totalPatients": "Total Patients",
        "page.newPatients": "New Patients",
        "page.appointments": "Appointments",
        "page.revenue": "Revenue",
        "page.thisMonth": "This month",
        "page.tabDiseaseTrends": "Disease Trends",
        "page.tabCptRevenue": "CPT Revenue",
        "page.tabCompliance": "Compliance",
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock("@/hooks/use-clinic-currency", () => ({
  useClinicCurrency: () => ({
    formatCurrency: (amount: number) => `₹${amount}`,
  }),
}));

const permissions = vi.hoisted(() => ({ canAccess: vi.fn(() => true) }));
vi.mock("@/lib/stores/permission-store", () => ({
  usePermissionStore: () => permissions,
}));

const baseProps = {
  overview: {
    totalPatients: 150,
    patientGrowth: 12,
    newPatientsThisMonth: 23,
    appointmentsThisMonth: 87,
    revenueThisMonth: 45000,
    revenueGrowth: 8,
  },
  diseaseTrends: [],
  revenueByCPT: [],
  complianceMetrics: [],
  isLoading: false,
  isError: false,
  onRetry: vi.fn(),
  trendsLoading: false,
  revenueLoading: false,
  complianceLoading: false,
  activeTab: "disease-trends" as AnalyticsTab,
  onTabChange: vi.fn(),
};

describe("AnalyticsPageUI", () => {
  beforeEach(() => {
    permissions.canAccess.mockReturnValue(true);
  });

  it("preserves the denied page heading and upgrade navigation without clinic metrics or chart tabs", () => {
    permissions.canAccess.mockReturnValue(false);
    render(<AnalyticsPageUI {...baseProps} />);

    expect(
      screen.getByRole("heading", { name: "Analytics", level: 1 }),
    ).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", {
        name: "Advanced Analytics Dashboard",
        level: 2,
      }),
    ).toBeVisible();
    expect(screen.getByText(/Get comprehensive insights/)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Upgrade to Pro" }),
    ).toHaveAttribute("href", SUBSCRIPTION_SETTINGS_PATH);
    expect(
      screen.getByRole("button", { name: "Back to Dashboard" }),
    ).toBeVisible();
    expect(screen.queryByText("150")).not.toBeInTheDocument();
    expect(screen.queryByText("₹45000")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("preserves the allowed heading, overview and chart tab actions", () => {
    const onTabChange = vi.fn();
    render(<AnalyticsPageUI {...baseProps} onTabChange={onTabChange} />);

    expect(
      screen.getByRole("heading", { name: "Analytics", level: 1 }),
    ).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("150")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Upgrade to Pro" }),
    ).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "CPT Revenue" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(onTabChange).toHaveBeenCalledWith("cpt-revenue");
  });

  it("shows loading state when isLoading is true", () => {
    render(<AnalyticsPageUI {...baseProps} isLoading />);
    expect(screen.getByText("Loading analytics…")).toBeInTheDocument();
  });

  it("shows error state with retry when isError is true", () => {
    render(<AnalyticsPageUI {...baseProps} isError />);
    // "Something went wrong" is sanitized to the fallback message
    expect(
      screen.getByText(/We could not load this section/),
    ).toBeInTheDocument();
  });

  it("renders the page header", () => {
    render(<AnalyticsPageUI {...baseProps} />);
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(
      screen.getByText("Track your clinic performance"),
    ).toBeInTheDocument();
  });

  it("renders overview cards with values", () => {
    render(<AnalyticsPageUI {...baseProps} />);
    expect(screen.getByText("Total Patients")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("New Patients")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText("Appointments")).toBeInTheDocument();
    expect(screen.getByText("87")).toBeInTheDocument();
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("₹45000")).toBeInTheDocument();
  });

  it("renders the tab triggers", () => {
    render(<AnalyticsPageUI {...baseProps} />);
    expect(screen.getByText("Disease Trends")).toBeInTheDocument();
    expect(screen.getByText("CPT Revenue")).toBeInTheDocument();
    expect(screen.getByText("Compliance")).toBeInTheDocument();
  });

  it("renders the Try again button in error state", () => {
    const onRetry = vi.fn();
    render(<AnalyticsPageUI {...baseProps} isError onRetry={onRetry} />);
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });
});
