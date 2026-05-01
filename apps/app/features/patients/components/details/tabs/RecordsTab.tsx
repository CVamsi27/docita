"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Pencil } from "lucide-react";
import type { PatientWithMedicalHistory } from "@workspace/types";
import { PatientMedicalHistoryContainer } from "@/features/patients/components/details/PatientMedicalHistoryContainer";

interface RecordsTabProps {
  patient: PatientWithMedicalHistory;
  canEditPatient: boolean;
}

export function RecordsTab({ patient, canEditPatient }: RecordsTabProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-4">
      {canEditPatient && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant={isEditing ? "default" : "outline"}
            onClick={() => setIsEditing((v) => !v)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            {isEditing ? "Editing records" : "Edit records"}
          </Button>
        </div>
      )}

      <PatientMedicalHistoryContainer
        patient={patient}
        readOnly={!isEditing}
        variant="consultation"
        allowGrowthEdit={false}
      />
    </div>
  );
}
