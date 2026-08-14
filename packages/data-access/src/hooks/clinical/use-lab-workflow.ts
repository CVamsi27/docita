"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feature, VerifyLabOrderPaymentRequest } from "@workspace/types";
import { useAPIQuery } from "../../core/use-api-query";
import { useAPIMutation } from "../../core/use-api-mutation";
import { APIRequestError } from "../../lib/errors";
import { queryKeys } from "../../lib/query-keys-clinician";
import { withQueryString } from "../../lib/query-string";
import { useDataAccessContext, useDataAccessFetcher } from "../../provider/hooks";

// jscpd:ignore-start
/**
 * Enriched lab-order row for the lab workspace queue.
 *
 * Mirrors the API contract shape in
 * `apps/api/src/domains/clinical/core/repositories/lab-workflow.repository.interface.ts`
 * but with date fields serialised to ISO strings (matching the JSON envelope).
 * The two declarations are intentionally kept in sync — one lives in the API
 * layer (Date objects) and one in the data-access layer (string dates after
 * JSON round-trip).
 */
export interface LabQueueItem {
  id: string;
  clinicId: string;
  labId: string | null;
  status: string;
  notes: string | null;
  resultUrl: string | null;
  resultUploadedAt: string | null;
  collectedAt: string | null;
  completedAt: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  releasedAt: string | null;
  createdAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  };
  labTest: {
    id: string;
    name: string;
    specimenType: string | null;
  };
}
// jscpd:ignore-end

const LAB_WORKFLOW_INVALIDATION = [
  queryKeys.clinical.labTests.queueInvalidation(),
  queryKeys.clinical.labTests.ordersInvalidation(),
  queryKeys.clinical.labTests.statsDashboard(),
] as const;

export const useLabQueue = (filters?: {
  labId?: string;
  status?: string;
  search?: string;
}) => {
  const labOk = useDataAccessContext().isTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<LabQueueItem[]>(
    queryKeys.clinical.labTests.queue(filters),
    withQueryString("/clinical/lab-tests/queue", filters),
    { enabled: labOk },
  );
};

export const useRecordSampleCollection = () =>
  useAPIMutation<{ success: true }, { id: string; notes?: string }>(
    (vars) => `/clinical/lab-tests/orders/${vars.id}/sample`,
    "PUT",
    {
      body: (vars) => ({ notes: vars.notes }),
      invalidateKeys: LAB_WORKFLOW_INVALIDATION,
    },
  );

export const useVerifyLabOrderPayment = () =>
  useAPIMutation<
    { success: true },
    { id: string } & VerifyLabOrderPaymentRequest
  >((vars) => `/clinical/lab-tests/orders/${vars.id}/payment`, "POST", {
    body: ({ id: _id, ...body }) => body,
    invalidateKeys: LAB_WORKFLOW_INVALIDATION,
  });

export const useReleaseLabResult = () =>
  useAPIMutation<{ success: true }, { id: string }>(
    (vars) => `/clinical/lab-tests/orders/${vars.id}/release`,
    "POST",
    {
      body: () => ({}),
      invalidateKeys: LAB_WORKFLOW_INVALIDATION,
    },
  );

/** Result upload is multipart/form-data, so it bypasses the JSON mutation helper. */
export const useUploadLabResult = () => {
  const fetcher = useDataAccessFetcher();
  const queryClient = useQueryClient();
  return useMutation<
    { success: true },
    APIRequestError,
    { id: string; file: File; notes?: string }
  >({
    mutationFn: async ({ id, file, notes }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (notes) formData.append("notes", notes);
      return await fetcher<{ success: true }>(
        `/clinical/lab-tests/orders/${id}/result`,
        { method: "POST", body: formData, retries: 0 },
      );
    },
    onSuccess: () => {
      LAB_WORKFLOW_INVALIDATION.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
    },
  });
};
