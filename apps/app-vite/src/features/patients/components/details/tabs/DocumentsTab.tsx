import { MedicalDocumentList } from "@/features/medical-documents";

interface DocumentsTabProps {
  patientId: string;
}

export function DocumentsTab({ patientId }: DocumentsTabProps) {
  return <MedicalDocumentList patientId={patientId} />;
}
