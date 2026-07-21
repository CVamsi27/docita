"use client";

import { useTranslations } from "next-intl";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@workspace/ui/components";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Lightbulb,
  MessageSquare,
  Star,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import type { InternalFeedbackStats } from "@workspace/data-access/internal";
import { FeedbackRatingStars } from "./feedback-display";

/**
 * Phase 3 (per-feature): apps/internal Feedback > Stats cards
 * (5 overview stat cards + 3 top-features cards). 9 literals
 * converted to useTranslations("Feedback.stats").
 */
function useFeedbackStatsTranslations() {
  return useTranslations("Feedback.stats");
}

function StatsOverviewCards({ stats }: { stats: InternalFeedbackStats }) {
  const t = useFeedbackStatsTranslations();
  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("totalFeedbackTitle")}</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {stats.total}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("recentFeedbackLabel", { count: stats.recentFeedback })}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("averageRatingTitle")}</CardTitle>
          <Star className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {stats.averageRating.toFixed(1)}
          </div>
          <FeedbackRatingStars rating={Math.round(stats.averageRating)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("newTitle")}</CardTitle>
          <AlertCircle className="h-4 w-4 text-info" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-info">
            {stats.byStatus.NEW || 0}
          </div>
          <p className="text-xs text-muted-foreground">{t("awaitingReviewLabel")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("inProgressTitle")}</CardTitle>
          <Clock className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-primary">
            {stats.byStatus.IN_PROGRESS || 0}
          </div>
          <p className="text-xs text-muted-foreground">{t("beingAddressedLabel")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("resolvedTitle")}</CardTitle>
          <CheckCircle className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-success">
            {stats.byStatus.RESOLVED || 0}
          </div>
          <p className="text-xs text-muted-foreground">{t("completedLabel")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function TopFeaturesCards({ stats }: { stats: InternalFeedbackStats }) {
  const t = useFeedbackStatsTranslations();
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <ThumbsUp className="h-5 w-5" />
            {t("topLikedTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topGoodFeatures.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noDataYet")}</p>
            ) : (
              stats.topGoodFeatures.slice(0, 5).map((item, idx) => (
                <div
                  key={item.feature}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">
                    {idx + 1}. {item.feature}
                  </span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ThumbsDown className="h-5 w-5" />
            {t("topBadTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topBadFeatures.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noIssuesReported")}
              </p>
            ) : (
              stats.topBadFeatures.slice(0, 5).map((item, idx) => (
                <div
                  key={item.feature}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">
                    {idx + 1}. {item.feature}
                  </span>
                  <Badge variant="destructive">{item.count}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <Lightbulb className="h-5 w-5" />
            {t("improvementRequestsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topImprovementAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noSuggestionsYet")}
              </p>
            ) : (
              stats.topImprovementAreas.slice(0, 5).map((item, idx) => (
                <div
                  key={item.feature}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">
                    {idx + 1}. {item.feature}
                  </span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface FeedbackStatsCardsProps {
  stats: InternalFeedbackStats | null;
}

export function FeedbackStatsCards({ stats }: FeedbackStatsCardsProps) {
  if (!stats) return null;

  return (
    <>
      <StatsOverviewCards stats={stats} />
      <TopFeaturesCards stats={stats} />
    </>
  );
}
