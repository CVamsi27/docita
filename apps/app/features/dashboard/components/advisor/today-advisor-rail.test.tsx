import { render, screen } from "@testing-library/react";
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
        advisorCounts={{
          pendingJoinRequests: 3,
          pendingReports: 0,
          waitingCount: 0,
        }}
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
        advisorCounts={{
          pendingJoinRequests: 0,
          pendingReports: 0,
          waitingCount: 1,
        }}
      />,
    );

    expect(screen.getByText("1 patient waiting")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open queue/i })).toHaveAttribute(
      "href",
      "/consultation",
    );
  });

  it("returns nothing when there are no recommendations to render", () => {
    const { container } = render(
      <TodayAdvisorRail
        advisorCounts={{
          pendingJoinRequests: 0,
          pendingReports: 0,
          waitingCount: 0,
        }}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
