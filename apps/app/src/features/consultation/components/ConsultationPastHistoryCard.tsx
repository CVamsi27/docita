import { lazy, Suspense } from "react";
import { History } from "lucide-react";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Collapsible, CollapsibleContent } from "@workspace/ui/components/overlay/collapsible";
import type { PatientWithMedicalHistory } from "@workspace/types";

const PatientMedicalHistoryContainerLazy = lazy(() =>
  import(
    "@/features/patients/components/details/PatientMedicalHistoryContainer"
  ).then((m) => ({ default: m.PatientMedicalHistoryContainer })),
);

function HistoryLoading() {
  return (
    <div className="flex items-center justify-center py-6">
      <DocitaLoadingIndicator variant="section" iconClassName="h-7 w-7" />
    </div>
  );
}

interface ConsultationPastHistoryCardProps {
  patient?: PatientWithMedicalHistory;
  patientLoading?: boolean;
  readOnly?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsultationPastHistoryCard({
  patient,
  patientLoading,
  readOnly,
  open,
  onOpenChange,
}: ConsultationPastHistoryCardProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleContent className="pb-3">
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-border/60 bg-card shadow-xs">
          <header className="flex items-center gap-2 border-b border-border/50 bg-muted/20 px-4 py-2.5">
            <History className="h-4 w-4 text-info" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">
              Past medical history
            </h3>
          </header>
          <div className="p-4">
            {patientLoading && !patient ? (
              <div className="flex items-center justify-center py-6">
                <DocitaLoadingIndicator
                  variant="section"
                  iconClassName="h-7 w-7"
                />
              </div>
            ) : patient ? (
              <Suspense fallback={<HistoryLoading />}>
                <PatientMedicalHistoryContainerLazy
                  patient={patient}
                  readOnly={readOnly}
                  variant="consultation"
                />
              </Suspense>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Could not load this patient&apos;s medical history.
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
