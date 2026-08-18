import { render, screen } from "@/test-utils";
import { describe, expect, it, vi } from "vitest";
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

vi.mock("@/components/auth/feature-gate", () => ({
  FeatureGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Feature: { ADVANCED_ANALYTICS: "ADVANCED_ANALYTICS" },
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
