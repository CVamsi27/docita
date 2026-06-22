import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalendarPlus, UserPlus } from "lucide-react";
import {
  DashboardQuickActionsUI,
  type QuickAction,
} from "./dashboard-quick-actions-ui";

describe("DashboardQuickActionsUI", () => {
  const actions: QuickAction[] = [
    {
      href: "/patients?action=new",
      icon: UserPlus,
      label: "New Patient",
      shortLabel: "Patient",
    },
    {
      href: "/appointments?action=new",
      icon: CalendarPlus,
      label: "New Appointment",
      shortLabel: "Appt",
      badge: 3,
    },
  ];

  it("renders the provided quick actions with their links", () => {
    render(<DashboardQuickActionsUI quickActions={actions} />);
    expect(
      screen.getByRole("link", { name: /New Patient/i }),
    ).toHaveAttribute("href", "/patients?action=new");
    expect(
      screen.getByRole("link", { name: /New Appointment/i }),
    ).toHaveAttribute("href", "/appointments?action=new");
  });

  it("always appends the All Patients shortcut", () => {
    render(<DashboardQuickActionsUI quickActions={actions} />);
    expect(
      screen.getByRole("link", { name: /All Patients/i }),
    ).toHaveAttribute("href", "/patients");
  });

  it("renders a badge when an action has one", () => {
    render(<DashboardQuickActionsUI quickActions={actions} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
