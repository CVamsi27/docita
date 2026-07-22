"use client";

import { Clock, Building2 } from "lucide-react";
import { Card } from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  DATE_FORMATS,
  formatDate,
  formatDistanceToNow,
} from "@workspace/utils";
import { useTranslations } from "next-intl";

/**
 * Phase 3 (per-feature): apps/app Onboarding > Join request status
 * pending card. 6 literals converted to
 * useTranslations("Onboarding.joinRequestPending").
 */
function useJoinRequestPendingTranslations() {
  return useTranslations("Onboarding.joinRequestPending");
}

export interface JoinRequestStatusItem {
  id: string;
  status: string;
  requestedRole: string;
  message?: string;
  rejectionReason?: string;
  requestedAt: string;
  expiresAt?: string;
  clinic: {
    id: string;
    name: string;
  };
}

export function JoinRequestStatusPendingCard({
  request,
  onWithdraw,
  isWithdrawing,
}: {
  request: JoinRequestStatusItem;
  onWithdraw: () => void;
  isWithdrawing: boolean;
}) {
  const t = useJoinRequestPendingTranslations();
  return (
    <Card className="ui-card-surface p-5 sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4 mb-6">
        <div className="p-3 rounded-full shrink-0 bg-warning/10 text-warning border border-warning/20">
          <Clock className="h-6 w-6 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="ui-section-title mb-1">{t("title")}</h2>
          <p className="ui-page-subtitle">
            {t("subtitlePrefix")}
            <span className="ml-1 font-semibold text-foreground">
              {request.clinic.name}
            </span>
            <span className="ml-1">{t("subtitleMid")}</span>
            <span className="ml-1 font-semibold text-foreground">
              {request.requestedRole}
            </span>
          </p>
        </div>
        <Badge variant="secondary" className="text-xs px-2.5 py-1 shrink-0">
          {request.status}
        </Badge>
      </div>

      <div className="border-t pt-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("submittedLabel")}</p>
            <p className="text-sm font-medium">
              {formatDistanceToNow(request.requestedAt)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(request.requestedAt, DATE_FORMATS.DATETIME_MEDIUM)}
            </p>
          </div>

          {request.expiresAt ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("expiresLabel")}</p>
              <p className="text-sm font-medium">
                {formatDistanceToNow(request.expiresAt)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(request.expiresAt, DATE_FORMATS.DATETIME_MEDIUM)}
              </p>
            </div>
          ) : null}
        </div>

        {request.message ? (
          <div>
            <p className="text-xs text-muted-foreground mb-2">{t("messageLabel")}</p>
            <Card className="p-3 bg-muted/50">
              <p className="text-sm">{request.message}</p>
            </Card>
          </div>
        ) : null}
      </div>

      <Alert className="mt-5">
        <Building2 className="h-4 w-4" />
        <AlertTitle>{t("nextStepsTitle")}</AlertTitle>
        <AlertDescription className="space-y-1.5 mt-1.5 text-sm">
          <p>{t("nextStepsBody1")}</p>
          <p>{t("nextStepsBody2")}</p>
        </AlertDescription>
      </Alert>

      <div className="flex justify-end mt-5">
        <Button
          variant="destructive"
          size="sm"
          onClick={onWithdraw}
          disabled={isWithdrawing}
        >
          {isWithdrawing ? t("withdrawingLabel") : t("withdrawButton")}
        </Button>
      </div>
    </Card>
  );
}
