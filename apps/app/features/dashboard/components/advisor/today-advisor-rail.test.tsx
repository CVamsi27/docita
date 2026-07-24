import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { TodayAdvisorRail } from "./today-advisor-rail";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const messages = {
  Dashboard: {
    todayAdvisorRail: {
      joinRequestsCategory: "Join requests",
      joinRequestsHeadline: "{count, plural, one {1 pending request} other {{count} pending requests}}",
      joinRequestsDescription: "Approve or decline staff requesting access to your clinic.",
      dismissJoinRequestsLabel: "Dismiss join requests recommendation",
      joinRequestsAction: "Review requests",
      codingCategory: "Coding",
      codingHeadline: "{count, plural, one {1 visit pending coding} other {{count} visits pending coding}}",
      codingDescription: "Review completed visits that need ICD-10 or procedure coding.",
      dismissCodingLabel: "Dismiss pending coding recommendation",
      codingAction: "Open coding queue",
      queueCategory: "Queue",
      queueHeadline: "{count, plural, one {1 patient waiting} other {{count} patients waiting}}",
      queueDescription: "Open the consultation queue to start the next patient.",
      dismissQueueLabel: "Dismiss queue recommendation",
      queueAction: "Open queue",
      stackAriaLabel: "Today recommendations",
    },
  },
};

function renderWithIntl(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("TodayAdvisorRail", () => {
  it("renders the join requests advisor card when there are pending requests", () => {
    renderWithIntl(
      <TodayAdvisorRail
        advisorCounts={{
          pendingJoinRequests: 3,
          uncodedVisits: 0,
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
    renderWithIntl(
      <TodayAdvisorRail
        advisorCounts={{
          pendingJoinRequests: 0,
          uncodedVisits: 0,
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
    const { container } = renderWithIntl(
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
