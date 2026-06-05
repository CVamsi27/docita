"use client";

import {
  ClaimStatusTransitionInput,
  ClaimDocument,
  CreateInsuranceClaimInput,
  Feature,
  InsuranceClaim,
  insuranceClaimSchema,
  PaginatedInsuranceClaimListResponse,
  UpdateInsuranceClaimInput,
} from "@workspace/types";
import { useAPIQuery } from "../core/use-api-query";
import { useAPIQueryValidated } from "../core/use-api-query-validated";
import { useAPIMutation } from "../core/use-api-mutation";
import { queryKeys } from "../lib/query-keys-clinician";
import { withQueryString } from "../lib/query-string";
import { useDataAccessContext } from "../provider/hooks";

export type InsuranceClaimFilters = {
  patientId?: string;
  invoiceId?: string;
  status?: string;
  claimType?: string;
  search?: string;
  cursor?: string;
  limit?: number;
};

/** Clinic-wide (or filtered) insurance-claim list. Gated on INSURANCE_BILLING. */
export const useInsuranceClaims = (filters?: InsuranceClaimFilters) => {
  const { isTierFeatureEnabled, getClinicId } = useDataAccessContext();
  const claimsOk = isTierFeatureEnabled(Feature.INSURANCE_BILLING);
  return useAPIQuery<PaginatedInsuranceClaimListResponse>(
    queryKeys.insuranceClaims.list(filters),
    withQueryString("/insurance-claims", filters),
    { enabled: claimsOk && Boolean(getClinicId()), staleTime: 60 * 1000 },
  );
};

/** Claims for a single patient (used on the patient profile panel). */
export const useInsuranceClaimsByPatient = (patientId: string) => {
  const claimsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.INSURANCE_BILLING,
  );
  return useAPIQuery<PaginatedInsuranceClaimListResponse>(
    queryKeys.insuranceClaims.byPatient(patientId),
    withQueryString("/insurance-claims", { patientId }),
    { enabled: claimsOk && patientId.length > 0, staleTime: 60 * 1000 },
  );
};

export const useInsuranceClaim = (id: string) => {
  const claimsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.INSURANCE_BILLING,
  );
  return useAPIQueryValidated(
    queryKeys.insuranceClaims.detail(id),
    `/insurance-claims/${id}`,
    insuranceClaimSchema,
    { enabled: claimsOk && id.length > 0 },
  );
};

export const useCreateInsuranceClaim = () =>
  useAPIMutation<InsuranceClaim, CreateInsuranceClaimInput>(
    "/insurance-claims",
    "POST",
    { invalidateKeys: [queryKeys.insuranceClaims.all()] },
  );

export const useUpdateInsuranceClaim = (id: string) =>
  useAPIMutation<InsuranceClaim, UpdateInsuranceClaimInput>(
    `/insurance-claims/${id}`,
    "PATCH",
    {
      invalidateKeys: [
        queryKeys.insuranceClaims.all(),
        queryKeys.insuranceClaims.detail(id),
      ],
    },
  );

export const useTransitionInsuranceClaim = (id: string) =>
  useAPIMutation<InsuranceClaim, ClaimStatusTransitionInput>(
    `/insurance-claims/${id}/transition`,
    "POST",
    {
      invalidateKeys: [
        queryKeys.insuranceClaims.all(),
        queryKeys.insuranceClaims.detail(id),
      ],
    },
  );

export const useAttachClaimDocument = (id: string) =>
  useAPIMutation<InsuranceClaim, { documentId: string }>(
    `/insurance-claims/${id}/documents`,
    "POST",
    {
      invalidateKeys: [
        queryKeys.insuranceClaims.all(),
        queryKeys.insuranceClaims.detail(id),
        queryKeys.insuranceClaims.attachableDocuments(id),
      ],
    },
  );

export const useAttachableClaimDocuments = (id: string) => {
  const claimsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.INSURANCE_BILLING,
  );
  return useAPIQuery<ClaimDocument[]>(
    queryKeys.insuranceClaims.attachableDocuments(id),
    `/insurance-claims/${id}/attachable-documents`,
    { enabled: claimsOk && id.length > 0 },
  );
};
