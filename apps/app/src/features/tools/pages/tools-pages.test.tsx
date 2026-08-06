import { describe, expect, it } from "vitest";
import { HelmetProvider } from "react-helmet-async";
import { render, screen } from "@/test-utils";
import { VisualTestPage } from "./tools-pages";

// P2.1 T-density smoke: prove the dev-tools page renders with its real English copy.
// Dev-only surface; fixture routing is exercised in manual QA.
describe("VisualTestPage (smoke)", () => {
  it("renders the fixture title and dashboard back-link", () => {
    render(
      <HelmetProvider>
        <VisualTestPage />
      </HelmetProvider>,
    );
    expect(screen.getByText("Fixture")).toBeInTheDocument();
    expect(screen.getByText("none selected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Back to dashboard/i }),
    ).toBeInTheDocument();
  });
});
