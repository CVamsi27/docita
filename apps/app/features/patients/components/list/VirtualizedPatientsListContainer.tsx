import { useRouter } from "next/navigation";
import { usePatients } from "../../hooks/usePatients";
import { getInitials } from "@/features/_shared/utils";
import { getPatientAgeDisplay } from "../../rules/patientRules";
import { VirtualizedPatientsListUI } from "./VirtualizedPatientsListUI";
import type { Patient } from "@workspace/types";

interface VirtualizedPatientsListContainerProps {
  searchQuery?: string;
  limit?: number;
}

export function VirtualizedPatientsListContainer({
  searchQuery,
  limit = 50,
}: VirtualizedPatientsListContainerProps) {
  const router = useRouter();

  const { data, isLoading } = usePatients({
    search: searchQuery,
    limit,
  });

  const patients = data?.items || [];

  const handlePatientClick = (patient: Patient) => {
    router.push(`/patients/${patient.id}`);
  };

  const getPatientInitials = (patient: Patient) => {
    return getInitials(patient.firstName, patient.lastName);
  };

  const getPatientAge = (patient: Patient) => {
    return getPatientAgeDisplay(patient);
  };

  return (
    <VirtualizedPatientsListUI
      patients={patients}
      loading={isLoading}
      onPatientClick={handlePatientClick}
      getPatientInitials={getPatientInitials}
      getPatientAge={getPatientAge}
    />
  );
}
