import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SUPPORT_EMAIL } from "@/lib/constants/support-contact";
import { AuthPreDashboardFooter } from "./AuthPreDashboardFooter";

describe("AuthPreDashboardFooter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders assurance labels, help actions, and contact details", () => {
    vi.stubEnv("VITE_WHATSAPP_SUPPORT_NUMBER", "918790311010");

    render(<AuthPreDashboardFooter />);

    expect(screen.getByText("Encrypted sessions")).toBeInTheDocument();
    expect(screen.getByText("Audit-ready activity")).toBeInTheDocument();
    expect(screen.getByText("Facility-aware access")).toBeInTheDocument();
    expect(screen.getByText("Need help")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Email/i })).toHaveAttribute(
      "href",
      `mailto:${SUPPORT_EMAIL}`,
    );
    expect(screen.getByRole("link", { name: /Call/i })).toHaveAttribute(
      "href",
      "tel:+918790311010",
    );
    expect(screen.getByRole("button", { name: "WhatsApp" })).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        element?.tagName === "P" &&
        element.textContent?.includes(SUPPORT_EMAIL) === true,
      ),
    ).toBeInTheDocument();
  });

  it("applies trust row visibility class when provided", () => {
    const { container } = render(
      <AuthPreDashboardFooter trustRowClassName="lg:hidden" />,
    );

    expect(
      container.querySelector('[aria-label="Security and privacy"]'),
    ).toHaveClass("lg:hidden");
  });
});
