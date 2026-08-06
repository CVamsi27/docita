import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { DashboardAlertsUI } from "./dashboard-alerts-ui";
import { AlertCircle } from "lucide-react";

const BASE_ALERT = {
  id: "alert-1",
  type: "info" as const,
  icon: AlertCircle,
  title: "Test Alert",
  description: "This is a test alert description.",
  dismissible: true,
};

describe("DashboardAlertsUI", () => {
  it("returns null when there are no alerts", () => {
    const { container } = render(
      <DashboardAlertsUI
        alerts={[]}
        progressPercentage={0}
        todayAppointments={0}
        completedAppointments={0}
        onDismissAlert={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders an alert with title and description", () => {
    render(
      <DashboardAlertsUI
        alerts={[BASE_ALERT]}
        progressPercentage={50}
        todayAppointments={10}
        completedAppointments={5}
        onDismissAlert={vi.fn()}
      />,
    );

    expect(screen.getByText("Test Alert")).toBeInTheDocument();
    expect(screen.getByText("This is a test alert description.")).toBeInTheDocument();
  });

  it("renders an alert with an action link", () => {
    render(
      <DashboardAlertsUI
        alerts={[
          {
            ...BASE_ALERT,
            action: { label: "View", href: "/consultation" },
          },
        ]}
        progressPercentage={50}
        todayAppointments={10}
        completedAppointments={5}
        onDismissAlert={vi.fn()}
      />,
    );

    const link = screen.getByRole("link", { name: /view/i });
    expect(link).toHaveAttribute("href", "/consultation");
  });

  it("renders dismiss button when dismissible", () => {
    render(
      <DashboardAlertsUI
        alerts={[BASE_ALERT]}
        progressPercentage={0}
        todayAppointments={0}
        completedAppointments={0}
        onDismissAlert={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Dismiss alert")).toBeInTheDocument();
  });

  it("calls onDismissAlert when dismiss button is clicked", () => {
    const onDismiss = vi.fn();
    render(
      <DashboardAlertsUI
        alerts={[BASE_ALERT]}
        progressPercentage={0}
        todayAppointments={0}
        completedAppointments={0}
        onDismissAlert={onDismiss}
      />,
    );

    screen.getByLabelText("Dismiss alert").click();
    expect(onDismiss).toHaveBeenCalledWith("alert-1");
  });

  it("renders progress bar showing completed/total", () => {
    render(
      <DashboardAlertsUI
        alerts={[BASE_ALERT]}
        progressPercentage={50}
        todayAppointments={10}
        completedAppointments={5}
        onDismissAlert={vi.fn()}
      />,
    );

    expect(screen.getByText("5/10")).toBeInTheDocument();
  });

  it("hides progress bar when showProgressBar is false", () => {
    render(
      <DashboardAlertsUI
        alerts={[BASE_ALERT]}
        progressPercentage={50}
        todayAppointments={10}
        completedAppointments={5}
        onDismissAlert={vi.fn()}
        showProgressBar={false}
      />,
    );

    expect(screen.queryByText("5/10")).not.toBeInTheDocument();
  });

  it("limits to 3 alerts maximum", () => {
    const alerts = Array.from({ length: 5 }, (_, i) => ({
      ...BASE_ALERT,
      id: `alert-${i}`,
      title: `Alert ${i + 1}`,
    }));

    render(
      <DashboardAlertsUI
        alerts={alerts}
        progressPercentage={0}
        todayAppointments={0}
        completedAppointments={0}
        onDismissAlert={vi.fn()}
      />,
    );

    expect(screen.getByText("Alert 1")).toBeInTheDocument();
    expect(screen.getByText("Alert 3")).toBeInTheDocument();
    expect(screen.queryByText("Alert 4")).not.toBeInTheDocument();
    expect(screen.queryByText("Alert 5")).not.toBeInTheDocument();
  });
});
