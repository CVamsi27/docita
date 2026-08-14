"use client";

import { Feature, type VitalSign } from "@workspace/types";
import { useAPIQuery } from "../../core/use-api-query";
import { useAPIMutation } from "../../core/use-api-mutation";
import { queryKeys } from "../../lib/query-keys-clinician";
import { useDataAccessContext } from "../../provider/hooks";

export const useVitalSigns = (patientId: string) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.BASIC_PATIENT_MANAGEMENT,
  );
  return useAPIQuery<VitalSign[]>(
    queryKeys.clinical.vitals.patient(patientId),
    `/patients/${patientId}/vitals`,
    { enabled: tierPatientsOk && !!patientId },
  );
};

export const useSaveVitals = (appointmentId: string) =>
  useAPIMutation<VitalSign, Partial<VitalSign>>(
    `/appointments/${appointmentId}/vitals`,
    "POST",
    {
      invalidateKeys: [queryKeys.clinical.vitals.all()],
    },
  );
