import { useParams } from "react-router";
import { PatientDetailPageRoute } from "@/features/patients/components/details/PatientDetailPageContent";

export function EnhancedPatientDetailPage() {
  const { id } = useParams();
  const patientId = typeof id === "string" ? id : "";
  return <PatientDetailPageRoute patientId={patientId} />;
}
