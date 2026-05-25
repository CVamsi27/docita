import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RightRailCard, RightRailCardStack } from "./right-rail-card";

describe("RightRailCard", () => {
  it("renders category, headline, and description", () => {
    render(
      <RightRailCard
        category="Verification"
        headline="Upload signature"
        description="Required to send digital prescriptions."
      />,
    );

    expect(screen.getByText("Verification")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /upload signature/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/required to send digital prescriptions/i),
    ).toBeInTheDocument();
  });

  it("invokes onDismiss when the close button is clicked", () => {
    const onDismiss = vi.fn();
    render(
      <RightRailCard
        category="Recap"
        headline="Hello"
        onDismiss={onDismiss}
        dismissLabel="Dismiss recap"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /dismiss recap/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe("RightRailCardStack", () => {
  it("uses an aside landmark with the provided label", () => {
    render(
      <RightRailCardStack ariaLabel="Today recommendations">
        <div>card</div>
      </RightRailCardStack>,
    );
    expect(
      screen.getByRole("complementary", { name: /today recommendations/i }),
    ).toBeInTheDocument();
  });
});
