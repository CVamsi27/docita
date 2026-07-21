"use client";

import { useActiveMedications } from "@workspace/data-access";
import { Badge, DataState, Progress, Section, type DataStateStatus } from "@workspace/ui/components";
import { useTranslations } from "next-intl";
import { Pill } from "lucide-react";
import { SummarySectionAction } from "./SummarySectionAction";

interface OngoingMedicationsSectionProps {
  patientId: string;
}

const clampPercentage = (value: number): number =>
  Math.max(0, Math.min(100, value));

export function OngoingMedicationsSection({
  patientId,
}: OngoingMedicationsSectionProps) {
  const t = useTranslations("Patients.summary.ongoingMedications");
  const {
    data: medications,
    isLoading,
    isError,
    refetch,
  } = useActiveMedications(patientId);

  const status: DataStateStatus =
    isLoading && !medications
      ? "loading"
      : isError
        ? "error"
        : !medications || medications.length === 0
          ? "empty"
          : "success";

  return (
    <Section
      title={t("title")}
      description={t("description")}
      actions={
        <SummarySectionAction
          href={`/patients/${patientId}?tab=records&subtab=prescriptions`}
          label={t("openAction")}
        />
      }
    >
      <DataState
        status={status}
        loadingMessage={t("loadingMessage")}
        errorMessage={t("errorMessage")}
        onRetry={() => refetch()}
        emptyIcon={Pill}
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyDescription")}
      >
        <div className="divide-y divide-border/60">
          {medications?.map((medication) => {
            const adherenceRate = medication.adherence
              ? clampPercentage(medication.adherence.adherenceRate)
              : null;
            return (
              <article
                key={medication.medicationId}
                className="space-y-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{medication.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[
                        medication.dosage,
                        medication.frequency,
                        medication.route,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {medication.isPRN ? (
                    <Badge variant="outline">{t("asNeededBadge")}</Badge>
                  ) : (
                    <Badge variant="secondary">{medication.duration}</Badge>
                  )}
                </div>
                {medication.prnInstructions ? (
                  <p className="text-xs text-muted-foreground">
                    {t("takeWhenLabel", {
                      instructions: medication.prnInstructions,
                    })}
                  </p>
                ) : null}
                {!medication.isPRN ? (
                  adherenceRate === null ? (
                    <p className="text-xs text-muted-foreground">
                      {t("adherencePending")}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {t("adherenceLabel")}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {Math.round(adherenceRate)}%
                        </span>
                      </div>
                      <Progress
                        value={adherenceRate}
                        aria-label={t("adherenceAria", {
                          name: medication.name ?? "",
                        })}
                      />
                      <p className="text-[length:var(--fs-2xs)] text-muted-foreground">
                        {t("adherenceSummary", {
                          taken: medication.adherence?.taken ?? 0,
                          total: medication.adherence?.totalDoses ?? 0,
                        })}
                      </p>
                    </div>
                  )
                ) : null}
              </article>
            );
          })}
        </div>
      </DataState>
    </Section>
  );
}
