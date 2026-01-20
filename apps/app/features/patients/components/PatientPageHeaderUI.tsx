import { ArrowLeft, FileJson } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

import { FhirExportDialog } from "./PatientDialogs";

interface PatientPageHeaderUIProps {
  patient: {
    id?: string;
    firstName: string;
    lastName: string;
  };
  onBack: () => void;
  onEdit: () => void;
  onNavigateToPatients: () => void;
}

export function PatientPageHeaderUI({
  patient,
  onBack,
  onEdit,
  onNavigateToPatients,
}: PatientPageHeaderUIProps) {
  if (!patient.id) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 -ml-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <nav className="flex items-center text-sm font-medium">
          <span
            className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            onClick={onNavigateToPatients}
          >
            Patients
          </span>
          <span className="mx-2 text-muted-foreground/30">/</span>
          <span className="text-foreground">
            {patient.firstName} {patient.lastName}
          </span>
        </nav>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button variant="outline" size="sm" onClick={onEdit} className="h-9">
          Edit Profile
        </Button>
        <FhirExportDialog
          patientId={patient.id}
          patientName={`${patient.firstName} ${patient.lastName}`}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            title="Export FHIR Data"
          >
            <FileJson className="h-4 w-4" />
          </Button>
        </FhirExportDialog>
      </div>
    </div>
  );
}
