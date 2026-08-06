import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { UpgradePage } from "./upgrade-page";

// P2.1 T-density smoke: prove the upgrade page renders its three plan cards.
describe("UpgradePage (smoke)", () => {
  it("renders the page title and the three plan names", () => {
    render(<UpgradePage />);
    expect(
      screen.getByRole("heading", { name: "Upgrade your plan" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Professional")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
  });
});
