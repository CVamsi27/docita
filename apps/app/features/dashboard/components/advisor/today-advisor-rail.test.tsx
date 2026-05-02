import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { TodayAdvisorRail } from "./today-advisor-rail";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("TodayAdvisorRail", () => {
  it("renders the join requests advisor card when there are pending requests", () => {
    render(
      <TodayAdvisorRail
        pendingJoinRequests={3}
        pendingReports={0}
        waitingCount={0}
        totalAppointments={0}
      />,
    );

    expect(screen.getByText("3 pending requests")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /review requests/i }),
    ).toHaveAttribute("href", "/settings/team/join-requests");
  });

  it("renders the waiting queue card with link to /consultation", () => {
    render(
      <TodayAdvisorRail
        pendingJoinRequests={0}
        pendingReports={0}
        waitingCount={1}
        totalAppointments={0}
      />,
    );

    expect(screen.getByText("1 patient waiting")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open queue/i })).toHaveAttribute(
      "href",
      "/consultation",
    );
  });

  it("always renders the weekly recap card and lets users dismiss it", () => {
    render(
      <TodayAdvisorRail
        pendingJoinRequests={0}
        pendingReports={0}
        waitingCount={0}
        totalAppointments={5}
      />,
    );

    expect(screen.getByText(/your week at a glance/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /dismiss weekly recap/i }),
    );

    expect(screen.queryByText(/your week at a glance/i)).not.toBeInTheDocument();
  });

  it("returns nothing when there are no recommendations to render", () => {
    const { container } = render(
      <TodayAdvisorRail
        pendingJoinRequests={0}
        pendingReports={0}
        waitingCount={0}
        totalAppointments={0}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /dismiss weekly recap/i }),
    );

    expect(container.firstChild).toBeNull();
  });
});
