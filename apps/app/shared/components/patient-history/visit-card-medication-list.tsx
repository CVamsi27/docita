import type { MedicationMetadata } from "./visit-card-config";

export function VisitCardMedicationList({
  medications,
}: {
  medications: MedicationMetadata[];
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">
        Medications
      </p>
      <div className="space-y-0.5">
        {medications.map((medication, index) => (
          <p key={index} className="text-xs">
            <span className="font-medium">{medication.name}</span>
            {medication.dosage && (
              <span className="text-muted-foreground">
                {" "}
                &middot; {medication.dosage}
              </span>
            )}
            {medication.frequency && (
              <span className="text-muted-foreground">
                {" "}
                &middot; {medication.frequency}
              </span>
            )}
          </p>
        ))}
      </div>
    </div>
  );
}
