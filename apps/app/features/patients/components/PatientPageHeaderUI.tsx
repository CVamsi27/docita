import { ArrowLeft, FileJson } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { DialogTrigger } from "@workspace/ui/components/dialog";
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
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="cursor-pointer hover:text-foreground"
            onClick={onNavigateToPatients}
          >
            Patients
          </span>
          <span>/</span>
          <span>
            {patient.firstName} {patient.lastName}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit Profile
        </Button>
        <FhirExportDialog
          patientId={patient.id}
          patientName={`${patient.firstName} ${patient.lastName}`}
        >
          {/* FhirExportDialog likely expects children to be the trigger, or handles it. 
             In page.tsx it was wrapped around a Button. 
             Checking page.tsx:
             <FhirExportDialog ...>
                <Button ...><FileJson .../></Button>
             </FhirExportDialog>
             So we wrap the button.
          */}
          <Button variant="ghost" size="icon">
            <FileJson className="h-4 w-4" />
          </Button>
        </FhirExportDialog>
      </div>
    </div>
  );
}
