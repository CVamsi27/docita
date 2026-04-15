import { getPatientAgeDisplay } from "@/features/patients/rules/patientRules";
import { getInitials } from "@/features/_shared/utils";
import { PatientFaceSheetHeaderUI } from "./PatientFaceSheetHeaderUI";
import {
  CODE_STATUS_LABELS,
  ISOLATION_STATUS_LABELS,
  type Patient,
} from "@workspace/types";
import { useUpdatePatient } from "@/hooks/api/use-patients";
import { useEffect, useRef, useState } from "react";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

interface PatientFaceSheetHeaderContainerProps {
  patient: Patient;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export function PatientFaceSheetHeaderContainer({
  patient,
  onBack,
  actions,
}: PatientFaceSheetHeaderContainerProps) {
  const initials = getInitials(patient.firstName, patient.lastName);
  const age = getPatientAgeDisplay(patient);
  const patientId = patient.id ?? "";
  const updatePatient = useUpdatePatient(patientId);
  const [mrnDraft, setMrnDraft] = useState(patient.mrn ?? "");
  const lastCommittedRef = useRef<string>(patient.mrn ?? "");

  useEffect(() => {
    const next = patient.mrn ?? "";
    setMrnDraft(next);
    lastCommittedRef.current = next;
  }, [patient.id, patient.mrn]);

  const isFullCode = patient.codeStatus === "FULL_CODE";
  const hasAllergies = !!patient.allergies && patient.allergies.length > 0;
  const isIsolation =
    !!patient.isolationStatus && patient.isolationStatus !== "NONE";

  const codeStatusLabel = patient.codeStatus
    ? CODE_STATUS_LABELS[patient.codeStatus]
    : undefined;
  const isolationStatusLabel = patient.isolationStatus
    ? ISOLATION_STATUS_LABELS[patient.isolationStatus]
    : undefined;

  return (
    <PatientFaceSheetHeaderUI
      firstName={patient.firstName}
      lastName={patient.lastName}
      mrn={patient.mrn ?? undefined}
      mrnDraft={mrnDraft}
      mrnSaving={updatePatient.isPending}
      onMrnChange={(value) => setMrnDraft(value)}
      onMrnCommit={async () => {
        if (!patientId) return;
        const normalized = mrnDraft.trim();
        if (normalized === lastCommittedRef.current.trim()) {
          return;
        }
        try {
          await updatePatient.mutateAsync({
            mrn: normalized ? normalized : null,
          });
          lastCommittedRef.current = normalized;
        } catch (err) {
          showUserFacingErrorToast(
            err,
            "We could not save the medical ID. Please try again.",
            "save",
          );
          // Roll back draft to last committed value so the UI stays consistent.
          setMrnDraft(lastCommittedRef.current);
        }
      }}
      age={age}
      gender={patient.gender || "UNKNOWN"}
      dateOfBirth={patient.dateOfBirth!}
      initials={initials}
      codeStatus={patient.codeStatus}
      codeStatusLabel={codeStatusLabel}
      isFullCode={isFullCode}
      isolationStatus={patient.isolationStatus}
      isolationStatusLabel={isolationStatusLabel}
      isIsolation={isIsolation}
      fallRisk={patient.fallRisk}
      allergies={patient.allergies ?? undefined}
      hasAllergies={hasAllergies}
      insuranceProvider={patient.insuranceProvider ?? undefined}
      insurancePolicyNumber={patient.insurancePolicyNumber ?? undefined}
      emergencyContactName={patient.emergencyContactName ?? undefined}
      emergencyContactPhone={patient.emergencyContactPhone ?? undefined}
      emergencyContactRelation={patient.emergencyContactRelation ?? undefined}
      onBack={onBack}
      actions={actions}
    />
  );
}
