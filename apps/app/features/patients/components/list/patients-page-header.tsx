import {
  Button,
  PageHeader
} from "@workspace/ui/components";
import { Stethoscope, UserPlus } from "lucide-react";

export function PatientsPageHeader({
  onAddPatient,
  onOpenConsultationQueue,
}: {
  onAddPatient: () => void;
  onOpenConsultationQueue?: () => void;
}) {
  return (
    <PageHeader
      title="Patients"
      description="Manage your patient records and history."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {onOpenConsultationQueue ? (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenConsultationQueue}
              className="gap-2"
            >
              <Stethoscope className="h-4 w-4" />
              <span className="hidden sm:inline">Consultation queue</span>
              <span className="sm:hidden">Queue</span>
            </Button>
          ) : null}
          <Button
            onClick={onAddPatient}
            className="gap-2"
            data-testid="patients-add-trigger"
          >
            <UserPlus className="h-4 w-4" />
            Add Patient
          </Button>
        </div>
      }
    />
  );
}
