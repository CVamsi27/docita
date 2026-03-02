import { useRouter } from "next/navigation";
import { usePatients } from "@/features/patients/hooks/usePatients";
import { getInitials } from "@/features/_shared/utils";
import { getPatientAgeDisplay } from "@/features/patients/rules/patientRules";
import {
  type PatientListItem,
  VirtualizedPatientsListUI,
} from "./VirtualizedPatientsListUI";

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

  const handlePatientClick = (patient: PatientListItem) => {
    if (!patient.id) return;
    router.push(`/patients/${patient.id}`);
  };

  const getPatientInitials = (patient: PatientListItem) => {
    return getInitials(patient.firstName, patient.lastName);
  };

  const getPatientAge = (patient: PatientListItem) => {
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
