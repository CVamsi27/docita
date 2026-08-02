import React, { FC, ReactNode } from "react";
import { Download } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";

// Re-exports from split dialog files
export { AddPatientDialog } from "./dialogs/AddPatientDialog";
export { EditPatientDialog } from "./dialogs/EditPatientDialog";

interface PatientFormDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export const PatientFormDialog: FC<PatientFormDialogProps> = ({ children }) => {
  return <>{children}</>;
};

interface FhirExportDialogProps {
  children?: ReactNode;
  patientId?: string;
  patientName?: string;
}

export const FhirExportDialog: FC<FhirExportDialogProps> = ({ children }) => {
  return (
    <>
      {children ?? (
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export FHIR
        </Button>
      )}
    </>
  );
};
