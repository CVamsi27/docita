import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatGrid, type StatItem } from "./stat-grid";

const items: StatItem[] = [
  {
    id: "total",
    label: "Total patients",
    value: 128,
    description: "Registered",
  },
  {
    id: "new",
    label: "New this week",
    value: 12,
    trend: { value: "+4%", direction: "up" },
  },
];

describe("StatGrid", () => {
  it("renders each stat label and value", () => {
    render(<StatGrid items={items} columns={2} />);

    expect(screen.getByText("Total patients")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("New this week")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders skeletons when loading", () => {
    const { container } = render(
      <StatGrid items={items} columns={2} isLoading />,
    );

    expect(screen.queryByText("Total patients")).not.toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-skeleton="true"]').length,
    ).toBeGreaterThan(0);
  });

  it("renders the trend indicator when provided", () => {
    render(<StatGrid items={items} columns={2} />);
    expect(screen.getByText("+4%")).toBeInTheDocument();
  });
});
