import { render, screen } from "@/test-utils";
import { describe, expect, it } from "vitest";
import { OverviewCard } from "./OverviewCard";

// Minimal icon stub
const MockIcon = () => <svg data-testid="mock-icon" />;

describe("OverviewCard", () => {
  it("renders the title and value", () => {
    render(
      <OverviewCard title="Total Patients" value={1234} icon={MockIcon} />,
    );
    expect(screen.getByText("Total Patients")).toBeInTheDocument();
    expect(screen.getByText("1234")).toBeInTheDocument();
  });

  it("renders a string value", () => {
    render(
      <OverviewCard
        title="Revenue"
        value="$12,345"
        icon={MockIcon}
      />,
    );
    expect(screen.getByText("$12,345")).toBeInTheDocument();
  });

  it("shows positive growth with TrendingUp icon", () => {
    render(
      <OverviewCard title="Patients" value={100} growth={12} icon={MockIcon} />,
    );
    expect(screen.getByText("+12%")).toBeInTheDocument();
    expect(screen.getByText("from last month")).toBeInTheDocument();
  });

  it("shows negative growth with TrendingDown icon", () => {
    render(
      <OverviewCard title="Revenue" value={500} growth={-5} icon={MockIcon} />,
    );
    expect(screen.getByText("-5%")).toBeInTheDocument();
    expect(screen.getByText("from last month")).toBeInTheDocument();
  });

  it("shows subtitle when growth is undefined", () => {
    render(
      <OverviewCard
        title="Appointments"
        value={42}
        subtitle="This month"
        icon={MockIcon}
      />,
    );
    expect(screen.getByText("This month")).toBeInTheDocument();
  });

  it("does not show 'from last month' when growth is undefined", () => {
    render(
      <OverviewCard title="Count" value={0} icon={MockIcon} />,
    );
    expect(screen.queryByText("from last month")).not.toBeInTheDocument();
  });

  it("renders the icon", () => {
    render(
      <OverviewCard title="Metric" value={1} icon={MockIcon} />,
    );
    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
  });
});
