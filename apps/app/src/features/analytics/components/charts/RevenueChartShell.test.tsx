import { render, screen } from "@/test-utils";
import { DollarSign } from "lucide-react";
import { describe, expect, it } from "vitest";
import { RevenueChartShell } from "./RevenueChartShell";

const sampleData = [
  { code: "99213", description: "Office visit", revenue: 500, count: 10 },
];

describe("RevenueChartShell", () => {
  it("shows a loading spinner when loading is true", () => {
    render(
      <RevenueChartShell
        title="Revenue"
        description="By procedure"
        data={[]}
        loading
        emptyIcon={DollarSign}
        emptyLabel="No data"
      >
        <div data-testid="chart-content" />
      </RevenueChartShell>,
    );
    expect(screen.queryByTestId("chart-content")).not.toBeInTheDocument();
    expect(screen.getByText("Loading chart…")).toBeInTheDocument();
  });

  it("shows empty state when data is empty and not loading", () => {
    render(
      <RevenueChartShell
        title="Revenue"
        description="By procedure"
        data={[]}
        loading={false}
        emptyIcon={DollarSign}
        emptyLabel="No revenue data"
        emptySublabel="Start coding"
      >
        <div data-testid="chart-content" />
      </RevenueChartShell>,
    );
    expect(screen.queryByTestId("chart-content")).not.toBeInTheDocument();
    expect(screen.getByText("No revenue data")).toBeInTheDocument();
    expect(screen.getByText("Start coding")).toBeInTheDocument();
  });

  it("renders children when data is present", () => {
    render(
      <RevenueChartShell
        title="Revenue"
        description="By procedure"
        data={sampleData}
        loading={false}
        emptyIcon={DollarSign}
        emptyLabel="No data"
      >
        <div data-testid="chart-content">Chart here</div>
      </RevenueChartShell>,
    );
    expect(screen.getByTestId("chart-content")).toBeInTheDocument();
    expect(screen.getByText("Chart here")).toBeInTheDocument();
  });

  it("displays the title and description", () => {
    render(
      <RevenueChartShell
        title="Revenue by Code"
        description="Top procedures"
        data={sampleData}
        loading={false}
        emptyIcon={DollarSign}
        emptyLabel="No data"
      >
        <div />
      </RevenueChartShell>,
    );
    expect(screen.getByText("Revenue by Code")).toBeInTheDocument();
    expect(screen.getByText("Top procedures")).toBeInTheDocument();
  });
});
