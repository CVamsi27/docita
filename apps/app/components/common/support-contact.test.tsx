import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSupportContactText,
  SUPPORT_EMAIL,
} from "@/lib/support-contact";
import { SupportContact } from "./support-contact";

describe("SupportContact", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows direct email, call link, and WhatsApp when support number is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER", "918790311010");

    render(<SupportContact />);

    expect(screen.getByRole("link", { name: SUPPORT_EMAIL })).toHaveAttribute(
      "href",
      `mailto:${SUPPORT_EMAIL}`,
    );
    expect(screen.getByRole("link", { name: "+91 87903 11010" })).toHaveAttribute(
      "href",
      "tel:+918790311010",
    );
    expect(screen.getByRole("button", { name: "WhatsApp" })).toBeInTheDocument();
  });

  it("falls back to the canonical support number when env is missing", () => {
    render(<SupportContact />);

    expect(screen.getByRole("link", { name: SUPPORT_EMAIL })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+91 87903 11010" })).toHaveAttribute(
      "href",
      "tel:+918790311010",
    );
    expect(screen.getByRole("button", { name: "WhatsApp" })).toBeInTheDocument();
  });

  it("renders stack layout with footer styling when requested", () => {
    const { container } = render(
      <SupportContact layout="stack" variant="footer" />,
    );

    expect(screen.getByText(/Need help\?/)).toBeInTheDocument();
    expect(
      container.querySelector(".rounded-lg.border.border-border\\/60"),
    ).toBeInTheDocument();
  });

  it("minimalLinks shows compact help row with accessible mailto/call labels", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER", "918790311010");

    render(<SupportContact minimalLinks />);

    expect(screen.getByRole("link", { name: /Email/i })).toHaveAttribute(
      "href",
      `mailto:${SUPPORT_EMAIL}`,
    );
    expect(screen.getByRole("link", { name: /Call/i })).toHaveAttribute(
      "href",
      "tel:+918790311010",
    );
    expect(screen.getByRole("button", { name: "WhatsApp" })).toBeInTheDocument();
  });
});

describe("getSupportContactText", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("includes WhatsApp and call when a support phone is available", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER", "918790311010");
    expect(getSupportContactText()).toContain(SUPPORT_EMAIL);
    expect(getSupportContactText()).toContain("WhatsApp");
    expect(getSupportContactText()).toContain("call");
  });
});
