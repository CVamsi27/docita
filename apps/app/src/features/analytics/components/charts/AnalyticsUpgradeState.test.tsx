import { render, screen } from "@/test-utils";
import { describe, expect, it } from "vitest";
import { AnalyticsUpgradeState } from "./AnalyticsUpgradeState";

describe("AnalyticsUpgradeState", () => {
  it("renders the upgrade heading", () => {
    render(<AnalyticsUpgradeState />);
    expect(
      screen.getByText("Advanced Analytics Dashboard"),
    ).toBeInTheDocument();
  });

  it("renders the description explaining the feature", () => {
    render(<AnalyticsUpgradeState />);
    expect(
      screen.getByText(/Get comprehensive insights/),
    ).toBeInTheDocument();
  });

  it("renders the upgrade button linking to subscription settings", () => {
    render(<AnalyticsUpgradeState />);
    const upgradeLink = screen.getByText("Upgrade to Pro");
    expect(upgradeLink).toBeInTheDocument();
    expect(upgradeLink.closest("a")).toHaveAttribute(
      "href",
      "/settings?tab=subscription",
    );
  });

  it("renders the back button", () => {
    render(<AnalyticsUpgradeState />);
    expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
  });
});
