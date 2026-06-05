"use client";

import {
  createMedicalConditionSchema,
  createPatientAllergySchema,
  createPatientFamilyHistorySchema,
  createPatientSocialHistorySchema,
  createPatientSurgicalHistorySchema,
  type CreateMedicalConditionInput,
  type CreatePatientAllergyInput,
  type CreatePatientFamilyHistoryInput,
  type CreatePatientSocialHistoryInput,
  type CreatePatientSurgicalHistoryInput,
  type PatientAllergy,
  type PatientFamilyHistory,
  type PatientMedicalCondition,
  type PatientSocialHistory,
  type PatientSurgicalHistory,
  type UpdatePatientAllergyInput,
  updatePatientAllergySchema,
} from "@workspace/types";
import { useAPIMutation } from "../core/use-api-mutation";
import { queryKeys } from "../lib/query-keys-clinician";

function patientMedicalHistoryInvalidateKeys(patientId: string) {
  return [
    queryKeys.patients.byId(patientId),
    queryKeys.patients.medicalHistoryFull(patientId),
    queryKeys.patients.withMedicalHistory(patientId),
  ] as const;
}

export function useCreatePatientCondition(patientId: string) {
  return useAPIMutation<PatientMedicalCondition, CreateMedicalConditionInput>(
    `/patients/${patientId}/medical-history/conditions`,
    "POST",
    {
      body: (data) => createMedicalConditionSchema.parse(data),
      invalidateKeys: patientMedicalHistoryInvalidateKeys(patientId),
    },
  );
}

export function useDeletePatientCondition(patientId: string) {
  return useAPIMutation<void, string>(
    (conditionId) =>
      `/patients/${patientId}/medical-history/conditions/${conditionId}`,
    "DELETE",
    {
      body: () => undefined,
      invalidateKeys: patientMedicalHistoryInvalidateKeys(patientId),
    },
  );
}

export function useCreatePatientAllergy(patientId: string) {
  return useAPIMutation<PatientAllergy, CreatePatientAllergyInput>(
    `/patients/${patientId}/medical-history/allergies`,
    "POST",
    {
      body: (data) => createPatientAllergySchema.parse(data),
      invalidateKeys: patientMedicalHistoryInvalidateKeys(patientId),
    },
  );
}

export function useUpdatePatientAllergy(patientId: string) {
  return useAPIMutation<
    PatientAllergy,
    UpdatePatientAllergyInput & { id: string }
  >(
    (allergy) =>
      `/patients/${patientId}/medical-history/allergies/${allergy.id}`,
    "PATCH",
    {
      body: ({ id: _id, ...data }) => updatePatientAllergySchema.parse(data),
      invalidateKeys: patientMedicalHistoryInvalidateKeys(patientId),
    },
  );
}

export function useDeletePatientAllergy(patientId: string) {
  return useAPIMutation<void, string>(
    (allergyId) =>
      `/patients/${patientId}/medical-history/allergies/${allergyId}`,
    "DELETE",
    {
      body: () => undefined,
      invalidateKeys: patientMedicalHistoryInvalidateKeys(patientId),
    },
  );
}

export function useCreatePatientSurgicalHistory(patientId: string) {
  return useAPIMutation<
    PatientSurgicalHistory,
    CreatePatientSurgicalHistoryInput
  >(`/patients/${patientId}/medical-history/surgical`, "POST", {
    body: (data) => createPatientSurgicalHistorySchema.parse(data),
    invalidateKeys: patientMedicalHistoryInvalidateKeys(patientId),
  });
}

export function useDeletePatientSurgicalHistory(patientId: string) {
  return useAPIMutation<void, string>(
    (surgicalId) =>
      `/patients/${patientId}/medical-history/surgical/${surgicalId}`,
    "DELETE",
    {
      body: () => undefined,
      invalidateKeys: patientMedicalHistoryInvalidateKeys(patientId),
    },
  );
}

export function useCreatePatientFamilyHistory(patientId: string) {
  return useAPIMutation<PatientFamilyHistory, CreatePatientFamilyHistoryInput>(
    `/patients/${patientId}/medical-history/family`,
    "POST",
    {
      body: (data) => createPatientFamilyHistorySchema.parse(data),
      invalidateKeys: patientMedicalHistoryInvalidateKeys(patientId),
    },
  );
}

export function useDeletePatientFamilyHistory(patientId: string) {
  return useAPIMutation<void, string>(
    (familyId) => `/patients/${patientId}/medical-history/family/${familyId}`,
    "DELETE",
    {
      body: () => undefined,
      invalidateKeys: patientMedicalHistoryInvalidateKeys(patientId),
    },
  );
}

export function useUpsertPatientSocialHistory(patientId: string) {
  return useAPIMutation<PatientSocialHistory, CreatePatientSocialHistoryInput>(
    `/patients/${patientId}/medical-history/social`,
    "POST",
    {
      body: (data) => createPatientSocialHistorySchema.parse(data),
      invalidateKeys: patientMedicalHistoryInvalidateKeys(patientId),
    },
  );
}
