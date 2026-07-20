"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/form/button";
import { Check, Pencil } from "lucide-react";
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
            aria-pressed={isEditing}
            onClick={() => setIsEditing((v) => !v)}
          >
            {isEditing ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Done
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit records
              </>
            )}
          </Button>
        </div>
      )}

      <PatientMedicalHistoryContainer
        patient={patient}
        readOnly={!isEditing}
        variant="consultation"
        allowGrowthEdit={isEditing}
      />
    </div>
  );
}
