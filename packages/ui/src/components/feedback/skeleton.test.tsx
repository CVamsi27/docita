import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders with default props and never applies banned motion classes", () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild;
    const bannedClass = ["animate", "pulse"].join("-");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).not.toHaveClass(bannedClass);
    expect(skeleton).toHaveClass("rounded-md");
    expect(skeleton).toHaveClass("bg-muted");
    expect(skeleton).toHaveAttribute("data-skeleton", "true");
  });

  it("applies custom className", () => {
    const { container } = render(<Skeleton className="h-12 w-12" />);
    const skeleton = container.firstChild;
    expect(skeleton).toHaveClass("h-12");
    expect(skeleton).toHaveClass("w-12");
  });

  it("renders with different variants", () => {
    const { container, rerender } = render(<Skeleton variant="text" />);
    let skeleton = container.firstChild;
    expect(skeleton).toHaveClass("h-4");
    expect(skeleton).toHaveClass("rounded");

    rerender(<Skeleton variant="circular" />);
    skeleton = container.firstChild;
    expect(skeleton).toHaveClass("rounded-full");

    rerender(<Skeleton variant="rectangular" />);
    skeleton = container.firstChild;
    expect(skeleton).toHaveClass("rounded-md");
  });

  it("renders multiple skeleton elements for list", () => {
    const { container } = render(
      <div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full mb-2" />
        ))}
      </div>,
    );

    const skeletons = container.querySelectorAll('[data-skeleton="true"]');
    expect(skeletons).toHaveLength(3);
  });
});
