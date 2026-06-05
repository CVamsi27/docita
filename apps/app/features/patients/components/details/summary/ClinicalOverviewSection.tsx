import { Badge } from "@workspace/ui/components/indicators/badge";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { Section } from "@workspace/ui/components/layout/section";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import type { PatientWithMedicalHistory } from "@workspace/types";
import { HeartPulse } from "lucide-react";
import { SummarySectionAction } from "./SummarySectionAction";

interface ClinicalOverviewSectionProps {
  patient: PatientWithMedicalHistory;
  patientId: string;
}

export function ClinicalOverviewSection({
  patient,
  patientId,
}: ClinicalOverviewSectionProps) {
  const conditions = patient.medicalConditions ?? [];
  const allergies = patient.patientAllergies ?? [];
  const recordsHref = `/patients/${patientId}?tab=records&subtab=history`;

  return (
    <Section
      title="Conditions & allergies"
      description="Critical problem-list items for quick review."
      actions={
        <SummarySectionAction href={recordsHref} label="Edit problem list" />
      }
    >
      {conditions.length === 0 && allergies.length === 0 ? (
        <DataState
          status="empty"
          emptyIcon={HeartPulse}
          emptyTitle="No conditions or allergies recorded"
          emptyDescription="Add history details when they become available."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Health conditions</h3>
            {conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No conditions recorded.
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
            <h3 className="text-sm font-semibold">Allergies</h3>
            {allergies.length === 0 ? (
              <p className="text-sm font-medium text-success">
                No known allergies.
              </p>
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
