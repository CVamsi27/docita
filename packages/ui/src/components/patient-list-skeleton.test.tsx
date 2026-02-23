import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PatientListSkeleton } from "./patient-list-skeleton";

describe("PatientListSkeleton", () => {
  it("renders with default 8 skeleton items", () => {
    const { container } = render(<PatientListSkeleton />);
    const skeletonItems = container.querySelectorAll(
      ".flex.items-center.gap-4",
    );
    expect(skeletonItems).toHaveLength(8);
  });

  it("renders avatar placeholders", () => {
    const { container } = render(<PatientListSkeleton />);
    const avatars = container.querySelectorAll(".h-12.w-12.rounded-full");
    expect(avatars).toHaveLength(8);
  });

  it("renders content area skeletons", () => {
    const { container } = render(<PatientListSkeleton />);
    // Each item should have name and detail lines
    const skeletonLines = container.querySelectorAll(".animate-pulse");
    expect(skeletonLines.length).toBeGreaterThan(24); // At least 3 per item (name + 2-3 details)
  });

  it("renders action button placeholders", () => {
    const { container } = render(<PatientListSkeleton />);
    // Each item has 2 action buttons
    const actionContainer = container.querySelectorAll(".flex.gap-2");
    expect(actionContainer.length).toBeGreaterThanOrEqual(8);
  });

  it("has proper spacing between items", () => {
    const { container } = render(<PatientListSkeleton />);
    const items = container.querySelectorAll(".flex.items-center.gap-4");

    items.forEach((item) => {
      // Check for padding and border
      expect(item.className).toContain("p-4");
      expect(item.className).toContain("border");
    });
  });

  it("renders all skeleton elements with animation", () => {
    const { container } = render(<PatientListSkeleton />);
    const animatedElements = container.querySelectorAll(".animate-pulse");

    // Should have many animated elements (avatars + content lines + buttons)
    // Each of 8 items has: 1 avatar + 1 name + 3 details + 2 buttons = 7 skeletons
    expect(animatedElements.length).toBeGreaterThanOrEqual(40);
  });
});
