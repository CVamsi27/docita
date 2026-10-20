import { render, screen } from "@/test-utils";
import { Activity } from "lucide-react";
import { describe, expect, it } from "vitest";
import { EmptyState, LoadingSpinner } from "./chart-helpers";

describe("LoadingSpinner", () => {
  it("renders with the loading message", () => {
    render(<LoadingSpinner />);
    expect(screen.getByText("Loading chart…")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<LoadingSpinner className="h-32" />);
    expect(container.firstChild).toHaveClass("h-32");
  });
});

describe("EmptyState", () => {
  it("renders the label as title", () => {
    render(<EmptyState icon={Activity} label="No data available" />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("renders the sublabel as description", () => {
    render(
      <EmptyState
        icon={Activity}
        label="No data"
        sublabel="Try again later"
      />,
    );
    expect(screen.getByText("Try again later")).toBeInTheDocument();
  });

  it("renders without sublabel", () => {
    render(<EmptyState icon={Activity} label="Empty" />);
    expect(screen.getByText("Empty")).toBeInTheDocument();
  });
});
