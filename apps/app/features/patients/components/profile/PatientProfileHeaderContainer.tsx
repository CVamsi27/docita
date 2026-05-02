import { usePatient } from "@/features/patients/hooks/usePatients";
import { getPatientAgeDisplay } from "@/features/patients/rules/patientRules";
import { getInitials } from "@/features/_shared/utils";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { PatientProfileHeaderUI } from "./PatientProfileHeaderUI";

interface PatientProfileHeaderContainerProps {
  patientId: string;
  onEdit?: () => void;
}

export function PatientProfileHeaderContainer({
  patientId,
  onEdit,
}: PatientProfileHeaderContainerProps) {
  const { data: patient, isLoading } = usePatient(patientId);

  if (isLoading || !patient) {
    return (
      <div
        className="rounded-lg border bg-card p-8"
        role="status"
        aria-live="polite"
        aria-label="Loading patient profile"
      >
        <div className="flex gap-6">
          <Skeleton
            variant="circular"
            className="h-32 w-32 rounded-full"
          />
          <div className="space-y-4 flex-1">
            <Skeleton className="h-8 w-1/3 rounded" />
            <Skeleton className="h-4 w-1/4 rounded" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded" />
              <Skeleton className="h-6 w-24 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const initials = getInitials(patient.firstName, patient.lastName);
  const ageDisplay = getPatientAgeDisplay(patient);

  return (
    <PatientProfileHeaderUI
      firstName={patient.firstName}
      lastName={patient.lastName}
      initials={initials}
      age={ageDisplay}
      gender={patient.gender || "UNKNOWN"}
      dateOfBirth={patient.dateOfBirth}
      patientId={patient.id || ""}
      email={patient.email || undefined}
      phoneNumber={patient.phoneNumber}
      address={patient.address || undefined}
      onEdit={onEdit}
    />
  );
}
