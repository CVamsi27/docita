import type { ReactElement } from "react";
import { Home } from "lucide-react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "../overlay/tooltip";
import { SidebarNavItem } from "./sidebar-nav-item";
import { SidebarRailAction } from "./sidebar-rail-action";
import { SidebarRailTooltip } from "./sidebar-rail-tooltip";

function renderWithTooltips(ui: ReactElement) {
  return render(<TooltipProvider delayDuration={0}>{ui}</TooltipProvider>);
}

describe("SidebarRailTooltip", () => {
  it("wraps children without changing accessible name", () => {
    renderWithTooltips(
      <SidebarRailTooltip label="Patients">
        <button type="button" aria-label="Patients">
          Icon
        </button>
      </SidebarRailTooltip>,
    );

    expect(screen.getByRole("button", { name: "Patients" })).toBeInTheDocument();
  });
});

describe("SidebarNavItem", () => {
  it("renders label text when showLabels is true", () => {
    renderWithTooltips(
      <SidebarNavItem
        label="Today"
        icon={Home}
        isActive={false}
        collapsedRail={false}
        showLabels
        renderLink={({ className, children, "aria-label": ariaLabel }) => (
          <a href="/today" className={className} aria-label={ariaLabel}>
            {children}
          </a>
        )}
      />,
    );

    expect(screen.getByRole("link", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("uses aria-label only in collapsed rail mode", () => {
    renderWithTooltips(
      <SidebarNavItem
        label="Patients"
        icon={Home}
        isActive={false}
        collapsedRail
        showLabels={false}
        renderLink={({ className, children, "aria-label": ariaLabel }) => (
          <a href="/patients" className={className} aria-label={ariaLabel}>
            {children}
          </a>
        )}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Patients" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Patients")).not.toBeInTheDocument();
  });
});

describe("SidebarRailAction", () => {
  it("passes children through when tooltip is disabled", () => {
    render(
      <SidebarRailAction label="Settings" showTooltip={false}>
        <button type="button">Settings</button>
      </SidebarRailAction>,
    );

    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });
});
