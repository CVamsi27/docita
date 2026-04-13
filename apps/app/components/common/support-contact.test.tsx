import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SupportContact } from "./support-contact";

describe("SupportContact", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows direct email and configured WhatsApp support details", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER", "918790311010");

    render(<SupportContact />);

    const email = screen.getByRole("link", { name: "support@docita.work" });
    const phone = screen.getByRole("link", { name: "+91 87903 11010" });

    expect(email).toHaveAttribute("href", "mailto:support@docita.work");
    expect(phone).toHaveAttribute("href", "tel:+918790311010");
  });

  it("falls back to the canonical support number when env is missing", () => {
    render(<SupportContact />);

    expect(screen.getByRole("link", { name: "support@docita.work" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+91 87903 11010" })).toHaveAttribute(
      "href",
      "tel:+918790311010",
    );
  });
});
