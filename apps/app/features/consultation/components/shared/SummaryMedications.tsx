import React from "react";
import { Pill } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

interface SummaryMedicationsProps {
  medications: Medication[];
}

export function SummaryMedications({ medications }: SummaryMedicationsProps) {
  if (!medications || medications.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium flex items-center gap-2">
        <Pill className="h-4 w-4" />
        Current Medications
      </div>
      <div className="space-y-2">
        {medications.map((med, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-sm p-2 bg-muted rounded-md"
          >
            <span className="font-medium">{med.name}</span>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Badge variant="outline">{med.dosage}</Badge>
              <span>{med.frequency}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
