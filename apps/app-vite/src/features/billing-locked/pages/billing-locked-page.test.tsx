import { describe, expect, it } from "vitest";
import { HelmetProvider } from "react-helmet-async";
import { render, screen } from "@/test-utils";
import { BillingLockedPage } from "./billing-locked-page";

// P2.1 T-density smoke: prove the page renders with its real English copy.
// Full functional coverage (lockout routing) is tracked in the feature-test-density backlog.
describe("BillingLockedPage (smoke)", () => {
  it("renders the workspace-access-paused heading", () => {
    render(
      <HelmetProvider>
        <BillingLockedPage />
      </HelmetProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Workspace access paused" }),
    ).toBeInTheDocument();
  });
});
