import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardSkeletonUI } from "./DashboardSkeletonUI";

vi.mock("@workspace/ui/components/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

describe("DashboardSkeletonUI", () => {
  it("renders expected skeleton structure", () => {
    const { container } = render(<DashboardSkeletonUI />);

    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons).toHaveLength(7);

    expect(container.querySelector(".min-h-screen")).toBeInTheDocument();
    expect(container.querySelector(".max-w-7xl")).toBeInTheDocument();
  });

  it("renders four stat card placeholders", () => {
    render(<DashboardSkeletonUI />);

    const statCards = screen
      .getAllByTestId("skeleton")
      .filter((item) => item.className.includes("h-28"));

    expect(statCards).toHaveLength(4);
  });
});