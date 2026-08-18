import { render, screen } from "@/test-utils";
import { describe, expect, it } from "vitest";
import { ComplianceDashboard } from "./ComplianceDashboard";
import type { ComplianceMetric } from "@/features/analytics/hooks/use-analytics-logic";

const compliantMetric: ComplianceMetric = {
  category: "Coding",
  metric: "Coding Completeness",
  score: 95,
  value: 95,
  issues: 2,
  status: "compliant",
};

const warningMetric: ComplianceMetric = {
  category: "Billing",
  metric: "Billing Rate",
  score: 72,
  value: 72,
  issues: 15,
  status: "warning",
};

describe("ComplianceDashboard", () => {
  it("shows a loading spinner when loading", () => {
    render(<ComplianceDashboard metrics={[]} loading />);
    expect(screen.getByText("Loading chart…")).toBeInTheDocument();
  });

  it("shows empty state when no metrics and not loading", () => {
    render(<ComplianceDashboard metrics={[]} loading={false} />);
    expect(screen.getByText("No compliance data available")).toBeInTheDocument();
    expect(
      screen.getByText(/Compliance metrics will appear once you code visits/),
    ).toBeInTheDocument();
  });

  it("renders metric cards with compliant status", () => {
    render(<ComplianceDashboard metrics={[compliantMetric]} loading={false} />);
    expect(screen.getByText("Coding Completeness")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText("Meeting standards")).toBeInTheDocument();
  });

  it("renders metric cards with warning status", () => {
    render(<ComplianceDashboard metrics={[warningMetric]} loading={false} />);
    expect(screen.getByText("Billing Rate")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("Needs improvement")).toBeInTheDocument();
  });

  it("renders multiple metric cards", () => {
    render(
      <ComplianceDashboard
        metrics={[compliantMetric, warningMetric]}
        loading={false}
      />,
    );
    expect(screen.getByText("Coding Completeness")).toBeInTheDocument();
    expect(screen.getByText("Billing Rate")).toBeInTheDocument();
  });

  it("shows the overview chart when metrics are present", () => {
    render(<ComplianceDashboard metrics={[compliantMetric]} loading={false} />);
    expect(
      screen.getByText("Compliance Metrics Overview"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Coding quality and timeliness metrics"),
    ).toBeInTheDocument();
  });

  it("does not show the overview chart when metrics are empty", () => {
    render(<ComplianceDashboard metrics={[]} loading={false} />);
    expect(
      screen.queryByText("Compliance Metrics Overview"),
    ).not.toBeInTheDocument();
  });
});
