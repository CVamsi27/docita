import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";

interface AdmissionPatientInfoProps {
  patientId: string;
  error?: string;
  onChange: (value: string) => void;
}

export function AdmissionPatientInfo({ patientId, error, onChange }: AdmissionPatientInfoProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="ipd-patient-id">Patient ID / MRN</Label>
      <Input
        id="ipd-patient-id"
        value={patientId}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Patient ID"
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
