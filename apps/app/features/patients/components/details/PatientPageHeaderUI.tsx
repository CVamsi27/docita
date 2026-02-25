import { Badge } from "@workspace/ui/components/badge";
import type { Patient } from "@workspace/types";

interface PatientPageHeaderUIProps {
  patient: Patient;
  onEdit?: () => void;
}

export function PatientPageHeaderUI({ patient, onEdit }: PatientPageHeaderUIProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold">
          {patient.firstName} {patient.lastName}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline">{patient.gender}</Badge>
          <span className="text-sm text-muted-foreground">
            ID: {patient.id?.slice(0, 8)}
          </span>
        </div>
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md"
        >
          Edit Patient
        </button>
      )}
    </div>
  );
}
