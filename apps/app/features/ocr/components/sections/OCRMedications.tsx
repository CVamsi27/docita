import { Pill } from "lucide-react";
import { SectionToggle } from "../SectionToggle";

interface OCRMedicationsProps {
  formData: any;
  isOpen: boolean;
  onToggle: () => void;
}

export const OCRMedications = ({
  formData,
  isOpen,
  onToggle,
}: OCRMedicationsProps) => {
  return (
    <div className="space-y-3">
      <SectionToggle
        title="Medications"
        icon={Pill}
        isOpen={isOpen}
        onToggle={onToggle}
        {...(formData.medications.length > 0
          ? { badge: String(formData.medications.length) }
          : {})}
      />
      {isOpen && (
        <div className="space-y-3 bg-muted/30 rounded-lg p-3">
          {formData.medications.length > 0 ? (
            formData.medications.map((med: any, idx: number) => (
              <div
                key={idx}
                className="p-2 border border-border rounded text-sm space-y-1"
              >
                <p>
                  <strong>{med.name}</strong> - {med.dosage}
                </p>
                <p className="text-xs text-muted-foreground">{med.frequency}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              No medications detected
            </p>
          )}
        </div>
      )}
    </div>
  );
};
