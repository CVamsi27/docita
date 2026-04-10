import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SupportContact } from "./support-contact";

describe("SupportContact", () => {
  it("shows direct email and phone fallback details", () => {
    render(<SupportContact />);

    const email = screen.getByRole("link", { name: "support@docita.work" });
    const phone = screen.getByRole("link", { name: "+91 87903 11010" });

    expect(email).toHaveAttribute("href", "mailto:support@docita.work");
    expect(phone).toHaveAttribute("href", "tel:+918790311010");
  });
});
