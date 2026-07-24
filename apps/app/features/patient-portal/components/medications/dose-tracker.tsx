"use client";

import { useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components";
import { Check, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@workspace/utils";
import { useTranslations } from "next-intl";
import { usePortalDoseHistory, useRecordPortalDose } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { mapPortalDoseRow, type PortalDoseStatus } from "@/features/patient-portal/lib/map-portal-records";
import { isRecord } from "@workspace/utils";

interface DoseTrackerProps {
  medicationId: string;
  medicationName: string;
  prescriptionId?: string;
}

export function DoseTracker({
  medicationId,
  medicationName,
  prescriptionId,
}: DoseTrackerProps) {
  const t = useTranslations("PatientPortal.doseTracker");
  const [notes, setNotes] = useState("");

  const { data: history, isLoading } = usePortalDoseHistory({
    prescriptionId,
    limit: 10,
  });

  const recordDose = useRecordPortalDose();

  const handleRecord = async (status: "TAKEN" | "MISSED" | "SKIPPED") => {
    try {
      await recordDose.mutateAsync({
        medicationId,
        status,
        takenAt: status === "TAKEN" ? new Date().toISOString() : undefined,
        notes: notes || undefined,
      });
      const toastKey =
        status === "TAKEN"
          ? "toastRecordedTaken"
          : status === "MISSED"
            ? "toastRecordedMissed"
            : "toastRecordedSkipped";
      toast.success(t(toastKey));
      setNotes("");
    } catch {
      showUserFacingErrorToast(t("errorRecord"));
    }
  };

  const statusConfig: Record<
    PortalDoseStatus,
    { icon: typeof Check; color: string; bg: string; text: string }
  > = {
    TAKEN: { icon: Check, color: "text-success", bg: "bg-success/10", text: t("status.TAKEN") },
    MISSED: { icon: X, color: "text-destructive", bg: "bg-destructive/10", text: t("status.MISSED") },
    SKIPPED: { icon: Clock, color: "text-warning", bg: "bg-warning/10", text: t("status.SKIPPED") },
    PENDING: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted", text: t("status.PENDING") },
    ADMINISTERED: { icon: Check, color: "text-success", bg: "bg-success/10", text: t("status.ADMINISTERED") },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("trackTitle", { name: medicationName })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">{t("recordTodayLabel")}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-success text-success hover:bg-success/10"
              onClick={() => handleRecord("TAKEN")}
              disabled={recordDose.isPending}
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              {t("tookItButton")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => handleRecord("MISSED")}
              disabled={recordDose.isPending}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              {t("missedButton")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRecord("SKIPPED")}
              disabled={recordDose.isPending}
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              {t("skipButton")}
            </Button>
          </div>
        </div>

        {!isLoading && history && history.doses.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">{t("recentDosesLabel")}</p>
            <div className="space-y-1.5">
              {history.doses
                .slice(0, 5)
                .filter(isRecord)
                .map((dose) => {
                  const doseRecord = mapPortalDoseRow(dose);
                  const config =
                    statusConfig[doseRecord.status] ?? statusConfig.PENDING;
                  const Icon = config.icon;
                  return (
                    <div
                      key={doseRecord.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-6 w-6 rounded-full flex items-center justify-center ${config.bg}`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                        </div>
                        <span className="text-muted-foreground">
                          {formatDate(doseRecord.scheduledAt, "d MMM, hh:mm a")}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${config.color}`}
                      >
                        {config.text}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
