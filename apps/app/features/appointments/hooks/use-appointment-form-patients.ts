import { useEffect, useMemo, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { CreateAppointmentInput } from "@workspace/types";
import { usePatient, usePatients } from "@workspace/data-access";
import {
  mergePatientsWithPreselected,
  shouldUpdatePreselectedPatient,
} from "./appointment-form-helpers";

interface UseAppointmentFormPatientsParams {
  preselectedPatientId: string | undefined;
  open: boolean | undefined;
  form: UseFormReturn<CreateAppointmentInput>;
}

export function useAppointmentFormPatients({
  preselectedPatientId,
  open,
  form,
}: UseAppointmentFormPatientsParams) {
  const [patientSearch, setPatientSearch] = useState("");
  const { data: searchedPatientsResponse, isLoading: patientsLoading } =
    usePatients({
      search: patientSearch || undefined,
      limit: patientSearch ? 20 : 10,
    });

  const { data: preselectedPatient } = usePatient(preselectedPatientId || "");

  const patients = useMemo(
    () =>
      mergePatientsWithPreselected(
        searchedPatientsResponse?.items ?? [],
        preselectedPatient,
        preselectedPatientId,
      ),
    [searchedPatientsResponse, preselectedPatient, preselectedPatientId],
  );

  const lastPreselectedPatientIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const patientState = form.getFieldState("patientId");
    if (
      shouldUpdatePreselectedPatient(
        open,
        preselectedPatientId,
        lastPreselectedPatientIdRef.current,
        patientState.isDirty,
      )
    ) {
      lastPreselectedPatientIdRef.current = preselectedPatientId;
      if (preselectedPatientId) {
        form.setValue("patientId", preselectedPatientId, { shouldDirty: false });
      }
    }
  }, [open, preselectedPatientId, form]);

  return {
    patients,
    patientsLoading,
    patientSearch,
    setPatientSearch,
  };
}
