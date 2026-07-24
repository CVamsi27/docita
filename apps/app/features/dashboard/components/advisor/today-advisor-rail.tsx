"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RightRailCard,
  RightRailCardStack,
} from "@workspace/ui/components/data-display/right-rail-card";
import { Button } from "@workspace/ui/components/form/button";
import { useTranslations } from "next-intl";

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
 *
 * Phase 3 (per-feature): 6 literals converted to
 * useTranslations("Dashboard.todayAdvisorRail").
 */
function useTodayAdvisorTranslations() {
  return useTranslations("Dashboard.todayAdvisorRail");
}

export function TodayAdvisorRail({ advisorCounts }: TodayAdvisorRailProps) {
  const t = useTodayAdvisorTranslations();
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
          category={t("joinRequestsCategory")}
          headline={t("joinRequestsHeadline", {
            count: pendingJoinRequests,
          })}
          description={t("joinRequestsDescription")}
          tone="warning"
          onDismiss={() => dismiss("join-requests")}
          dismissLabel={t("dismissJoinRequestsLabel")}
          action={
            <Button asChild size="sm">
              <Link href="/settings/team/join-requests">{t("joinRequestsAction")}</Link>
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
          category={t("codingCategory")}
          headline={t("codingHeadline", { count: uncodedVisits })}
          description={t("codingDescription")}
          tone="warning"
          onDismiss={() => dismiss("uncoded-visits")}
          dismissLabel={t("dismissCodingLabel")}
          action={
            <Button asChild size="sm">
              <Link href="/coding-queue">{t("codingAction")}</Link>
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
          category={t("queueCategory")}
          headline={t("queueHeadline", { count: waitingCount })}
          description={t("queueDescription")}
          onDismiss={() => dismiss("waiting-queue")}
          dismissLabel={t("dismissQueueLabel")}
          action={
            <Button asChild size="sm">
              <Link href="/consultation">{t("queueAction")}</Link>
            </Button>
          }
        />
      ),
    });
  }

  if (cards.length === 0) return null;

  return (
    <RightRailCardStack
      ariaLabel={t("stackAriaLabel")}
      className="w-full max-w-full shrink-0 max-md:mx-0 max-md:flex-col max-md:overflow-visible max-md:px-0 max-md:pb-0 max-md:[&>*]:min-w-0"
    >
      {cards.map((card) => (
        <div key={card.key}>{card.node}</div>
      ))}
    </RightRailCardStack>
  );
}
