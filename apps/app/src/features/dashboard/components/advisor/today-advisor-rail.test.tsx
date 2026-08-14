import { describe, expect, it } from "vitest";

import { render, screen } from "@/test-utils";

import { TodayAdvisorRail } from "./today-advisor-rail";

describe("TodayAdvisorRail", () => {
  it("renders the join requests advisor card when there are pending requests", () => {
    render(
      <TodayAdvisorRail
        advisorCounts={{
          pendingJoinRequests: 3,
          uncodedVisits: 0,
          waitingCount: 0,
        }}
      />,
    );

    // Copy is driven by Dashboard.advisor.joinRequestsHeadline (en.json).
    expect(screen.getByText("3 pending requests")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /review/i }),
    ).toHaveAttribute("href", "/settings/team/join-requests");
  });

  it("renders the waiting queue card with link to /consultation", () => {
    render(
      <TodayAdvisorRail
        advisorCounts={{
          pendingJoinRequests: 0,
          uncodedVisits: 0,
          waitingCount: 1,
        }}
      />,
    );

    expect(screen.getByText("1 patient waiting")).toBeInTheDocument();
    // Action label is Dashboard.advisor.queueAction (en.json) — "Open queue".
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
          uncodedVisits: 0,
          waitingCount: 0,
        }}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
