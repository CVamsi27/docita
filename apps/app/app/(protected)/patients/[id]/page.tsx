import { PatientDetailPageRoute } from "@/features/patients/components/details/PatientDetailPageContent";

type PatientDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = await params;
  return <PatientDetailPageRoute patientId={id} />;
}
