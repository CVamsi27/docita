"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RightRailCard,
  RightRailCardStack,
} from "@workspace/ui/components/right-rail-card";
import { Button } from "@workspace/ui/components/button";

interface TodayAdvisorRailProps {
  pendingJoinRequests: number;
  pendingReports: number;
  waitingCount: number;
}

type CardKey = "join-requests" | "pending-reports" | "waiting-queue";

/**
 * Origin-style advisor cards rendered to the right of the today workspace.
 * Cards are dismissible per session (no persistence yet — the dismiss state is
 * only retained while the page is mounted).
 */
export function TodayAdvisorRail({
  pendingJoinRequests,
  pendingReports,
  waitingCount,
}: TodayAdvisorRailProps) {
  const [dismissed, setDismissed] = useState<Set<CardKey>>(new Set());

  function dismiss(key: CardKey) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  const cards: Array<{ key: CardKey; node: React.ReactNode }> = [];

  if (pendingJoinRequests > 0 && !dismissed.has("join-requests")) {
    cards.push({
      key: "join-requests",
      node: (
        <RightRailCard
          category="Join requests"
          headline={`${pendingJoinRequests} pending request${
            pendingJoinRequests === 1 ? "" : "s"
          }`}
          description="Approve or decline staff requesting access to your clinic."
          tone="warning"
          onDismiss={() => dismiss("join-requests")}
          dismissLabel="Dismiss join requests recommendation"
          action={
            <Button asChild size="sm">
              <Link href="/settings/team/join-requests">Review requests</Link>
            </Button>
          }
        />
      ),
    });
  }

  if (pendingReports > 0 && !dismissed.has("pending-reports")) {
    cards.push({
      key: "pending-reports",
      node: (
        <RightRailCard
          category="Pending"
          headline={`${pendingReports} report${
            pendingReports === 1 ? "" : "s"
          } awaiting sign-off`}
          description="Review and sign queued lab results and prescriptions."
          tone="info"
          onDismiss={() => dismiss("pending-reports")}
          dismissLabel="Dismiss pending reports recommendation"
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/lab-tests">Open lab tests</Link>
            </Button>
          }
        />
      ),
    });
  }

  if (waitingCount > 0 && !dismissed.has("waiting-queue")) {
    cards.push({
      key: "waiting-queue",
      node: (
        <RightRailCard
          category="Queue"
          headline={`${waitingCount} patient${
            waitingCount === 1 ? "" : "s"
          } waiting`}
          description="Open the consultation queue to start the next patient."
          onDismiss={() => dismiss("waiting-queue")}
          dismissLabel="Dismiss queue recommendation"
          action={
            <Button asChild size="sm">
              <Link href="/consultation">Open queue</Link>
            </Button>
          }
        />
      ),
    });
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <RightRailCardStack
      ariaLabel="Today recommendations"
      className="w-full max-w-full shrink-0"
    >
      {cards.map((card) => (
        <div key={card.key}>{card.node}</div>
      ))}
    </RightRailCardStack>
  );
}
