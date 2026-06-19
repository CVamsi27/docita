"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RightRailCard,
  RightRailCardStack,
} from "@workspace/ui/components/data-display/right-rail-card";
import { Button } from "@workspace/ui/components/form/button";

export type TodayAdvisorCounts = {
  pendingJoinRequests: number;
  uncodedVisits: number;
  waitingCount: number;
};

interface TodayAdvisorRailProps {
  advisorCounts: TodayAdvisorCounts;
}

type CardKey = "join-requests" | "uncoded-visits" | "waiting-queue";

/**
 * Origin-style advisor cards rendered to the right of the today workspace.
 * Cards are dismissible per session (no persistence yet — the dismiss state is
 * only retained while the page is mounted).
 */
export function TodayAdvisorRail({ advisorCounts }: TodayAdvisorRailProps) {
  const { pendingJoinRequests, uncodedVisits, waitingCount } = advisorCounts;
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

  if (uncodedVisits > 0 && !dismissed.has("uncoded-visits")) {
    cards.push({
      key: "uncoded-visits",
      node: (
        <RightRailCard
          category="Coding"
          headline={`${uncodedVisits} visit${
            uncodedVisits === 1 ? "" : "s"
          } pending coding`}
          description="Review completed visits that need ICD-10 or procedure coding."
          tone="warning"
          onDismiss={() => dismiss("uncoded-visits")}
          dismissLabel="Dismiss pending coding recommendation"
          action={
            <Button asChild size="sm">
              <Link href="/coding-queue">Open coding queue</Link>
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

  if (cards.length === 0) return null;

  return (
    <RightRailCardStack
      ariaLabel="Today recommendations"
      className="w-full max-w-full shrink-0 max-md:mx-0 max-md:flex-col max-md:overflow-visible max-md:px-0 max-md:pb-0 max-md:[&>*]:min-w-0"
    >
      {cards.map((card) => (
        <div key={card.key}>{card.node}</div>
      ))}
    </RightRailCardStack>
  );
}
