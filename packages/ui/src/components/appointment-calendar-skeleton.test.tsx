import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppointmentCalendarSkeleton } from "./appointment-calendar-skeleton";

describe("AppointmentCalendarSkeleton", () => {
  it("renders calendar header skeleton", () => {
    const { container } = render(<AppointmentCalendarSkeleton />);
    // Should have header with month/year placeholder
    const header = container.querySelector(".h-8.w-48");
    expect(header).toBeInTheDocument();
  });

  it("renders header navigation buttons", () => {
    const { container } = render(<AppointmentCalendarSkeleton />);
    const navButtons = container.querySelectorAll(".h-10.w-10.rounded-md");
    expect(navButtons).toHaveLength(2);
  });

  it("renders 7 day header skeletons", () => {
    const { container } = render(<AppointmentCalendarSkeleton />);
    const dayHeadersContainer = container.querySelector(".grid-cols-7.gap-px.border-b");
    expect(dayHeadersContainer).toBeInTheDocument();
    const dayHeaders = dayHeadersContainer?.querySelectorAll(".h-6");
    expect(dayHeaders).toHaveLength(7);
  });

  it("renders calendar grid with 35 cells (5 weeks)", () => {
    const { container } = render(<AppointmentCalendarSkeleton />);
    const gridCells = container.querySelectorAll(".min-h-24");
    expect(gridCells).toHaveLength(35);
  });

  it("renders appointment slot skeletons within some cells", () => {
    const { container } = render(<AppointmentCalendarSkeleton />);
    // Some cells have appointment slots (every 3rd cell)
    const cells = container.querySelectorAll(".min-h-24");
    let cellsWithSlots = 0;
    cells.forEach((cell) => {
      const slots = cell.querySelectorAll(".h-6.w-full");
      if (slots.length > 0) cellsWithSlots++;
    });
    expect(cellsWithSlots).toBeGreaterThan(0);
  });

  it("has responsive grid layout", () => {
    const { container } = render(<AppointmentCalendarSkeleton />);
    const grid = container.querySelector(".grid-cols-7");
    expect(grid).toBeInTheDocument();
  });

  it("renders legend at the bottom", () => {
    const { container } = render(<AppointmentCalendarSkeleton />);
    const legend = container.querySelector(".flex.gap-4");
    expect(legend).toBeInTheDocument();
    const legendItems = legend?.querySelectorAll(".h-4.w-32");
    expect(legendItems).toHaveLength(3);
  });

  it("renders all skeleton elements with animation", () => {
    const { container } = render(<AppointmentCalendarSkeleton />);
    const animatedElements = container.querySelectorAll(".animate-pulse");
    
    // Should have many animated elements (header + nav + days + slots + legend)
    // 1 header + 2 nav + 7 day names + 35 day numbers + various slots + 3 legend = many
    expect(animatedElements.length).toBeGreaterThan(40);
  });
});
