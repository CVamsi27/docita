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

    const skeletonLines = container.querySelectorAll(".animate-shimmer");
    expect(skeletonLines.length).toBeGreaterThan(24); 
  });

  it("renders action button placeholders", () => {
    const { container } = render(<PatientListSkeleton />);

    const actionContainer = container.querySelectorAll(".flex.gap-2");
    expect(actionContainer.length).toBeGreaterThanOrEqual(8);
  });

  it("has proper spacing between items", () => {
    const { container } = render(<PatientListSkeleton />);
    const items = container.querySelectorAll(".flex.items-center.gap-4");

    items.forEach((item) => {

      expect(item.className).toContain("p-4");
      expect(item.className).toContain("border");
    });
  });

  it("renders all skeleton elements with animation", () => {
    const { container } = render(<PatientListSkeleton />);
    const animatedElements = container.querySelectorAll(".animate-shimmer");

    expect(animatedElements.length).toBeGreaterThanOrEqual(40);
  });
});
