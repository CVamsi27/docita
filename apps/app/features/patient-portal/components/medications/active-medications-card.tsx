"use client";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components";
import { Pill } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ActiveMedication } from "@workspace/types";
import { formatDate } from "@/lib/formatters";

interface ActiveMedicationsCardProps {
  medications: ActiveMedication[];
}

export function ActiveMedicationsCard({
  medications,
}: ActiveMedicationsCardProps) {
  const t = useTranslations("PatientPortal.activeMedications");

  if (medications.length === 0)
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {medications.map((med) => (
          <div
            key={med.medicationId}
            className="rounded-lg border p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{med.name}</p>
                <p className="text-sm text-muted-foreground">
                  {med.dosage} &middot; {med.frequency}
                  {med.route && med.route !== "PO" && ` &middot; ${med.route}`}
                </p>
              </div>
              {med.isPRN ? (
                <Badge variant="outline">{t("asNeededBadge")}</Badge>
              ) : (
                <Badge variant="secondary">{med.duration}</Badge>
              )}
            </div>

            {med.prnInstructions && (
              <p className="text-xs text-muted-foreground">
                {t("takeWhenLabel", { instructions: med.prnInstructions })}
              </p>
            )}

            {med.startDate && (
              <p className="text-xs text-muted-foreground">
                {t("startedLabel", { date: formatDate(med.startDate) })}
                {med.endDate && ` &middot; ${t("untilLabel", { date: formatDate(med.endDate) })}`}
              </p>
            )}

            {med.adherence && !med.isPRN && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("adherenceLabel")}</span>
                  <span className="font-medium">
                    {Math.round(med.adherence.adherenceRate)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      med.adherence.adherenceRate >= 80
                        ? "bg-success"
                        : med.adherence.adherenceRate >= 50
                          ? "bg-warning"
                          : "bg-destructive"
                    }`}
                    style={{
                      width: `${Math.min(100, med.adherence.adherenceRate)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("adherenceSummary", {
                    taken: med.adherence.taken,
                    total: med.adherence.totalDoses,
                  })}
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
