import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalyticsDashboard } from "./analytics-dashboard";

describe("AnalyticsDashboard", () => {
  const defaultMetrics = [
    { title: "Total Users", value: "1,234", change: "+12%", trend: "up" as const },
    { title: "Revenue", value: "₹45,678", change: "+8%", trend: "up" as const },
  ];

  it("renders loading state", () => {
    const { container } = render(
      <AnalyticsDashboard loading={true} error="" onRetry={vi.fn()} metrics={[]} />,
    );
    // DataState renders loading state — should not be empty
    expect(container.firstChild).not.toBeNull();
  });

  it("renders error state with retry button", () => {
    render(
      <AnalyticsDashboard loading={false} error="Failed to load" onRetry={vi.fn()} metrics={[]} />,
    );
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders metrics when loaded", () => {
    render(
      <AnalyticsDashboard loading={false} error="" onRetry={vi.fn()} metrics={defaultMetrics} />,
    );
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("renders export button", () => {
    render(
      <AnalyticsDashboard loading={false} error="" onRetry={vi.fn()} metrics={defaultMetrics} />,
    );
    expect(screen.getByRole("button", { name: /export report/i })).toBeInTheDocument();
  });
});
