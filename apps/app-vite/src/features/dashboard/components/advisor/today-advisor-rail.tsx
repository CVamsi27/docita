import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
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

export function TodayAdvisorRail({ advisorCounts }: TodayAdvisorRailProps) {
  const { t } = useTranslation("Dashboard");
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
          category={t("advisor.joinRequestsCategory")}
          headline={t("advisor.joinRequestsHeadline", { count: pendingJoinRequests })}
          description={t("advisor.joinRequestsDescription")}
          tone="warning"
          onDismiss={() => dismiss("join-requests")}
          dismissLabel={t("advisor.dismissLabel")}
          action={
            <Button asChild size="sm">
              <Link to="/settings/team/join-requests">{t("advisor.joinRequestsAction")}</Link>
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
          category={t("advisor.codingCategory")}
          headline={t("advisor.codingHeadline", { count: uncodedVisits })}
          description={t("advisor.codingDescription")}
          tone="warning"
          onDismiss={() => dismiss("uncoded-visits")}
          dismissLabel={t("advisor.dismissLabel")}
          action={
            <Button asChild size="sm">
              <Link to="/coding-queue">{t("advisor.codingAction")}</Link>
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
          category={t("advisor.queueCategory")}
          headline={t("advisor.queueHeadline", { count: waitingCount })}
          description={t("advisor.queueDescription")}
          onDismiss={() => dismiss("waiting-queue")}
          dismissLabel={t("advisor.dismissLabel")}
          action={
            <Button asChild size="sm">
              <Link to="/consultation">{t("advisor.queueAction")}</Link>
            </Button>
          }
        />
      ),
    });
  }

  if (cards.length === 0) return null;

  return (
    <RightRailCardStack
      ariaLabel={t("advisor.stackAriaLabel")}
      className="w-full max-w-full shrink-0 max-md:mx-0 max-md:flex-col max-md:overflow-visible max-md:px-0 max-md:pb-0 max-md:[&>*]:min-w-0"
    >
      {cards.map((card) => (
        <div key={card.key}>{card.node}</div>
      ))}
    </RightRailCardStack>
  );
}