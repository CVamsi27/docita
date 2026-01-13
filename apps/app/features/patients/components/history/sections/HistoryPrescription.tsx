
import { Pill } from "lucide-react";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface PrescriptionData {
  medications?: Medication[];
  instructions?: string;
}

export function HistoryPrescription({
  prescription,
}: {
  prescription: PrescriptionData;
}) {
  if (!prescription) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Pill className="h-4 w-4 text-blue-600" />
        Prescription
      </div>
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        {prescription.medications?.map((med, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">{med.name}</p>
              <p className="text-xs text-muted-foreground">
                {med.dosage} • {med.frequency} • {med.duration}
              </p>
            </div>
          </div>
        ))}
        {prescription.instructions && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Instructions:</p>
            <p className="text-sm">{prescription.instructions}</p>
          </div>
        )}
      </div>
    </div>
  );
}
