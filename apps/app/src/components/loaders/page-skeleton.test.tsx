import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  DashboardSkeleton,
  ListPageSkeleton,
  DetailPageSkeleton,
  StatCardsSkeleton,
  CardGridSkeleton,
  TableSkeleton,
} from "./page-skeleton";

describe("DashboardSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.querySelector("[data-skeleton]")).toBeTruthy();
  });

  it("renders specified number of stat cards", () => {
    const { container } = render(<DashboardSkeleton actionCount={3} />);
    const bars = container.querySelectorAll("[data-skeleton]");
    expect(bars.length).toBeGreaterThanOrEqual(3);
  });
});

describe("ListPageSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<ListPageSkeleton />);
    expect(container.querySelector("[data-skeleton]")).toBeTruthy();
  });

  it("renders specified number of rows", () => {
    const { container } = render(<ListPageSkeleton rowCount={4} />);
    const bars = container.querySelectorAll("[data-skeleton]");
    expect(bars.length).toBeGreaterThanOrEqual(4);
  });
});

describe("DetailPageSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<DetailPageSkeleton />);
    expect(container.querySelector("[data-skeleton]")).toBeTruthy();
  });
});

describe("StatCardsSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<StatCardsSkeleton />);
    expect(container.querySelector("[data-skeleton]")).toBeTruthy();
  });

  it("renders the default 4 card placeholders", () => {
    const { container } = render(<StatCardsSkeleton />);
    const cards = container.querySelectorAll(".rounded-lg.border");
    expect(cards).toHaveLength(4);
  });

  it("renders a custom number of card placeholders", () => {
    const { container } = render(<StatCardsSkeleton cardCount={6} />);
    const cards = container.querySelectorAll(".rounded-lg.border");
    expect(cards).toHaveLength(6);
  });

  it("renders a single card placeholder", () => {
    const { container } = render(<StatCardsSkeleton cardCount={1} />);
    const cards = container.querySelectorAll(".rounded-lg.border");
    expect(cards).toHaveLength(1);
  });

  it("renders skeleton bars inside each card", () => {
    const { container } = render(<StatCardsSkeleton cardCount={2} />);
    expect(container.querySelectorAll("[data-skeleton]").length).toBeGreaterThanOrEqual(4);
  });
});

describe("CardGridSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<CardGridSkeleton />);
    expect(container.querySelector("[data-skeleton]")).toBeTruthy();
  });

  it("renders the default 6 card placeholders", () => {
    const { container } = render(<CardGridSkeleton />);
    const cards = container.querySelectorAll(".rounded-lg.border");
    expect(cards).toHaveLength(6);
  });

  it("renders a custom number of card placeholders", () => {
    const { container } = render(<CardGridSkeleton cardCount={3} />);
    const cards = container.querySelectorAll(".rounded-lg.border");
    expect(cards).toHaveLength(3);
  });

  it("renders 2-column grid when columns=2", () => {
    const { container } = render(<CardGridSkeleton columns={2} />);
    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("sm:grid-cols-2");
    expect(grid?.className).not.toContain("lg:grid-cols-3");
    expect(grid?.className).not.toContain("lg:grid-cols-4");
  });

  it("renders 3-column grid by default", () => {
    const { container } = render(<CardGridSkeleton />);
    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("sm:grid-cols-2");
    expect(grid?.className).toContain("lg:grid-cols-3");
  });

  it("renders 4-column grid when columns=4", () => {
    const { container } = render(<CardGridSkeleton columns={4} />);
    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("sm:grid-cols-2");
    expect(grid?.className).toContain("lg:grid-cols-4");
  });

  it("falls back to 3 columns for unknown column values", () => {
    const { container } = render(<CardGridSkeleton columns={5 as never} />);
    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("lg:grid-cols-3");
  });

  it("renders skeleton bars inside each card", () => {
    const { container } = render(<CardGridSkeleton cardCount={2} />);
    expect(container.querySelectorAll("[data-skeleton]").length).toBeGreaterThanOrEqual(6);
  });
});

describe("TableSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<TableSkeleton />);
    expect(container.querySelector("[data-skeleton]")).toBeTruthy();
  });

  it("renders the default 4 rows", () => {
    const { container } = render(<TableSkeleton />);
    const rows = container.querySelectorAll(".p-4");
    expect(rows).toHaveLength(4);
  });

  it("renders a custom number of rows", () => {
    const { container } = render(<TableSkeleton rowCount={8} />);
    const rows = container.querySelectorAll(".p-4");
    expect(rows).toHaveLength(8);
  });

  it("renders a single row", () => {
    const { container } = render(<TableSkeleton rowCount={1} />);
    const rows = container.querySelectorAll(".p-4");
    expect(rows).toHaveLength(1);
  });

  it("renders name and badge skeleton bars per row", () => {
    const { container } = render(<TableSkeleton rowCount={2} />);
    const bars = container.querySelectorAll("[data-skeleton]");
    // Each row has at least 3 bars: name, subtitle, badge
    expect(bars.length).toBeGreaterThanOrEqual(6);
  });

  it("renders inside a bordered container with dividers", () => {
    const { container } = render(<TableSkeleton />);
    expect(container.querySelector(".rounded-lg.border")).toBeTruthy();
    expect(container.querySelector(".divide-y")).toBeTruthy();
  });
});
