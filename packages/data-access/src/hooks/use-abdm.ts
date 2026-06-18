import type {
  AbdmCareContext,
  AbdmExternalRecord,
  AbdmOpsInbox,
  CreateAbdmCareContextRequest,
  CreateAbdmConsentRequest,
  AbdmConsentRequest,
} from "@workspace/types";
import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";
import { queryKeys } from "../lib/query-keys-clinician";
import { withQueryString } from "../lib/query-string";

export const useAbdmCareContexts = (
  patientId?: string | null,
  queryOptions?: { enabled?: boolean },
) =>
  useAPIQuery<AbdmCareContext[]>(
    queryKeys.abdm.careContexts(patientId),
    withQueryString("/abdm/care-contexts", {
      patientId: patientId ?? undefined,
    }),
    {
      enabled: queryOptions?.enabled,
      staleTime: 60 * 1000,
    },
  );

export const useCreateAbdmCareContext = () =>
  useAPIMutation<AbdmCareContext, CreateAbdmCareContextRequest>(
    "/abdm/care-contexts",
    "POST",
    {
      invalidateKeys: [queryKeys.abdm.all()],
      suppressGlobalErrorToast: true,
    },
  );

export const useRequestAbdmCareContextLink = () =>
  useAPIMutation<AbdmCareContext, { id: string }>(
    ({ id }) => `/abdm/care-contexts/${id}/link-request`,
    "POST",
    {
      body: () => undefined,
      invalidateKeys: [queryKeys.abdm.all()],
      suppressGlobalErrorToast: true,
    },
  );

export const useRequestAbdmCareContextShare = () =>
  useAPIMutation<AbdmCareContext, { id: string }>(
    ({ id }) => `/abdm/care-contexts/${id}/share-request`,
    "POST",
    {
      body: () => undefined,
      invalidateKeys: [queryKeys.abdm.all()],
      suppressGlobalErrorToast: true,
    },
  );

export const useCreateAbdmConsentRequest = () =>
  useAPIMutation<AbdmConsentRequest, CreateAbdmConsentRequest>(
    "/abdm/consent-requests",
    "POST",
    {
      invalidateKeys: [queryKeys.abdm.all()],
      suppressGlobalErrorToast: true,
    },
  );

export const useAbdmOpsInbox = (queryOptions?: { enabled?: boolean }) =>
  useAPIQuery<AbdmOpsInbox>(queryKeys.abdm.opsInbox(), "/abdm/ops-inbox", {
    enabled: queryOptions?.enabled,
    staleTime: 30 * 1000,
  });

export const useAbdmExternalRecords = (
  patientId?: string | null,
  queryOptions?: { enabled?: boolean },
) =>
  useAPIQuery<AbdmExternalRecord[]>(
    queryKeys.abdm.externalRecords(patientId),
    withQueryString("/abdm/external-records", {
      patientId: patientId ?? undefined,
    }),
    {
      enabled: queryOptions?.enabled,
      staleTime: 60 * 1000,
    },
  );
