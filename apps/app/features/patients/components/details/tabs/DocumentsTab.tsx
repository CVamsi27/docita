"use client";

import { MedicalDocumentList } from "@/features/medical-documents/components/MedicalDocumentList";

interface DocumentsTabProps {
  patientId: string;
}

export function DocumentsTab({ patientId }: DocumentsTabProps) {
  return <MedicalDocumentList patientId={patientId} />;
}
