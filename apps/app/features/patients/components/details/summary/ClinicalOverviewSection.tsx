import { Badge, DataState, Section } from "@workspace/ui/components";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { usePatientSnapshot } from "@workspace/data-access";
import { useTranslations } from "next-intl";
import { HeartPulse } from "lucide-react";
import { SummarySectionAction } from "./SummarySectionAction";

interface ClinicalOverviewSectionProps {
  patientId: string;
}

export function ClinicalOverviewSection({
  patientId,
}: ClinicalOverviewSectionProps) {
  const t = useTranslations("Patients.summary.clinicalOverview");
  // Read the active problem list from the patient snapshot (same source as the
  // clinical snapshot strip) rather than the base patient record, which does
  // not carry the structured conditions/allergies relations.
  const { data: snapshot } = usePatientSnapshot(patientId);
  const conditions = snapshot?.activeConditions ?? [];
  const allergies = snapshot?.activeAllergies ?? [];
  const recordsHref = `/patients/${patientId}?tab=records&subtab=history`;

  return (
    <Section
      title={t("title")}
      description={t("description")}
      actions={
        <SummarySectionAction href={recordsHref} label={t("editAction")} />
      }
    >
      {conditions.length === 0 && allergies.length === 0 ? (
        <DataState
          status="empty"
          emptyIcon={HeartPulse}
          emptyTitle={t("emptyTitle")}
          emptyDescription={t("emptyDescription")}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{t("conditionsHeading")}</h3>
            {conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("conditionsEmpty")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {conditions.map((condition, index) => (
                  <Badge
                    key={condition.id ?? `${condition.conditionName}-${index}`}
                    variant="outline"
                    className="gap-1.5"
                  >
                    {condition.conditionName}
                    <span className="text-[length:var(--fs-2xs)] text-muted-foreground">
                      {humanizeUiLabel(condition.status)}
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{t("allergiesHeading")}</h3>
            {allergies.length === 0 ? (
              <p className="text-sm font-medium text-success">{t("allergiesEmpty")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allergies.map((allergy, index) => (
                  <Badge
                    key={allergy.id ?? `${allergy.allergen}-${index}`}
                    variant="outline"
                    className="badge-danger gap-1.5"
                  >
                    {allergy.allergen}
                    <span className="text-[length:var(--fs-2xs)] opacity-80">
                      {humanizeUiLabel(allergy.severity)}
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}
