import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { FloatingStartConsultation } from "@/components/consultation/floating-start-consultation";

describe("floating consultation navigation", () => {
  it.each(["/today", "/consultation", "/consultation/encounter"])(
    "leaves %s actions to the clinical workspace",
    (pathname) => {
      render(<FloatingStartConsultation canStartConsultation />, {
        initialEntries: [pathname],
      });
      expect(
        screen.queryByRole("link", { name: "Start consultation" }),
      ).toBeNull();
    },
  );

  it("does not expose clinical actions without permission", () => {
    render(<FloatingStartConsultation canStartConsultation={false} />, {
      initialEntries: ["/patients"],
    });
    expect(
      screen.queryByRole("link", { name: "Start consultation" }),
    ).toBeNull();
  });

  it("provides queue navigation on other permitted routes", () => {
    render(<FloatingStartConsultation canStartConsultation />, {
      initialEntries: ["/patients"],
    });
    expect(
      screen.getByRole("link", { name: "Start consultation" }),
    ).toHaveAttribute("href", "/consultation");
  });
});
