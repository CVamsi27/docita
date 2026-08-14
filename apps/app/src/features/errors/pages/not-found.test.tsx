import { describe, expect, it } from "vitest";
import { HelmetProvider } from "react-helmet-async";
import { render, screen } from "@/test-utils";
import { NotFoundPage } from "./not-found";

// P2.1 T-density smoke: prove the 404 page renders with its real English copy.
describe("NotFoundPage (smoke)", () => {
  it("renders the 404 status and message", () => {
    render(
      <HelmetProvider>
        <NotFoundPage />
      </HelmetProvider>,
    );
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByText("The page you are looking for does not exist or has moved."),
    ).toBeInTheDocument();
  });

  it("links back to today's schedule", () => {
    render(
      <HelmetProvider>
        <NotFoundPage />
      </HelmetProvider>,
    );
    expect(
      screen.getByRole("link", { name: "Go to today's schedule" }),
    ).toHaveAttribute("href", "/today");
  });
});
