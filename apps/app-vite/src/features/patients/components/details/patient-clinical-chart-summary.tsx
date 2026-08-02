import { usePatientSnapshot } from "@workspace/data-access";
import { PatientSnapshotStrip } from "@/components/patient-history";

export interface PatientClinicalChartSummaryProps {
  patientId: string;
}

export function PatientClinicalChartSummary({
  patientId,
}: PatientClinicalChartSummaryProps) {
  const { data: snapshot } = usePatientSnapshot(patientId);

  if (!snapshot) return null;

  return (
    <div className="mb-5" data-testid="patient-clinical-chart-summary">
      <PatientSnapshotStrip
        snapshot={snapshot}
        layout="horizontal"
        showVitals
        compact
      />
    </div>
  );
}
