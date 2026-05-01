import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import type { Patient } from "@workspace/types";

interface PatientPageHeaderUIProps {
  patient: Patient;
  onEdit?: () => void;
}

export function PatientPageHeaderUI({ patient, onEdit }: PatientPageHeaderUIProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
          <Link href="/patients">
            <ChevronLeft className="h-4 w-4" />
            Patients
          </Link>
        </Button>
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="ui-page-title">
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
          <Button onClick={onEdit}>
            Edit Patient
          </Button>
        )}
      </div>
    </div>
  );
}
