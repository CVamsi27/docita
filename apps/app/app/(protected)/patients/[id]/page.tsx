export const dynamic = "force-dynamic";

import { PatientDetailPageClient } from "@/features/patients/components/details/PatientDetailPageClient";

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({
  params,
}: PatientDetailPageProps) {
  const { id } = await params;
  return <PatientDetailPageClient patientId={id} />;
}
