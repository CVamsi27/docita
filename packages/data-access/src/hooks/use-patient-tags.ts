import {
  type CreatePatientTagRequest,
  Feature,
  type PatientTag,
  type UpdatePatientTagRequest,
} from "@workspace/types";
import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";
import { queryKeys } from "../lib/query-keys-clinician";
import { useDataAccessContext } from "../provider/hooks";

export function usePatientTags(patientId: string, options?: { enabled?: boolean }) {
  const patientsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.BASIC_PATIENT_MANAGEMENT,
  );

  return useAPIQuery<PatientTag[]>(
    queryKeys.patients.tags(patientId),
    `/patients/${patientId}/tags`,
    {
      enabled: patientsOk && Boolean(patientId) && (options?.enabled ?? true),
    },
  );
}

export function useCreatePatientTag(patientId: string) {
  return useAPIMutation<PatientTag, CreatePatientTagRequest>(
    `/patients/${patientId}/tags`,
    "POST",
    {
      invalidateKeys: [
        queryKeys.patients.tags(patientId),
        queryKeys.patients.detail(patientId),
      ],
    },
  );
}

export function useUpdatePatientTag(patientId: string) {
  return useAPIMutation<
    PatientTag,
    UpdatePatientTagRequest & { tagId: string }
  >(({ tagId }) => `/patients/${patientId}/tags/${tagId}`, "PATCH", {
    body: ({ tagId: _tagId, ...body }) => body,
    invalidateKeys: [
      queryKeys.patients.tags(patientId),
      queryKeys.patients.detail(patientId),
    ],
  });
}

export function useDeletePatientTag(patientId: string) {
  return useAPIMutation<{ ok: boolean }, { tagId: string }>(
    ({ tagId }) => `/patients/${patientId}/tags/${tagId}`,
    "DELETE",
    {
      body: () => undefined,
      invalidateKeys: [
        queryKeys.patients.tags(patientId),
        queryKeys.patients.detail(patientId),
      ],
    },
  );
}
