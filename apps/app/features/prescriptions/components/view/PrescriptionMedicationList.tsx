import type { Medication } from "@workspace/types";

interface PrescriptionMedicationListProps {
  medications?: Medication[];
  instructions?: string;
}

export function PrescriptionMedicationList({ medications, instructions }: PrescriptionMedicationListProps) {
  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-5xl font-serif font-bold text-primary leading-none">℞</span>
          <span className="text-lg font-semibold text-muted-foreground">Medications</span>
        </div>
        <div className="space-y-3 pl-4 border-l-2 border-primary/20">
          {medications?.map((med: Medication, index: number) => (
            <div key={index} className="p-3 bg-muted/30 rounded-lg print:bg-transparent print:border print:border-muted-foreground/20">
              <div className="flex items-start gap-2">
                <span className="font-bold text-primary">{index + 1}</span>
                <div className="flex-1">
                  <p className="font-semibold text-base">{med.name}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1 text-sm print:grid-cols-3">
                    <div><span className="text-muted-foreground">Dosage: </span><span className="font-medium">{med.dosage}</span></div>
                    <div><span className="text-muted-foreground">Frequency: </span><span className="font-medium">{med.frequency}</span></div>
                    <div><span className="text-muted-foreground">Duration: </span><span className="font-medium">{med.duration}</span></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {instructions && (
        <div>
          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">Instructions</h3>
          <p className="text-sm surface-warning p-4 rounded-lg whitespace-pre-wrap print:bg-warning print:border-warning/30">
            {instructions}
          </p>
        </div>
      )}
    </>
  );
}
