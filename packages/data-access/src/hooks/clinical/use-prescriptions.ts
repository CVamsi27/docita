"use client";

import type { UseQueryOptions } from "@tanstack/react-query";
import {
  CreatePrescriptionRequest,
  type Patient,
  type Prescription,
} from "@workspace/types";
import { useAPIQuery } from "../../core/use-api-query";
import { useAPIMutation } from "../../core/use-api-mutation";
import { APIRequestError } from "../../lib/errors";
import { queryKeys } from "../../lib/query-keys-clinician";
import { withQueryString } from "../../lib/query-string";
import { usePollPdfJob } from "./_shared";

type PrescriptionListRow = Prescription & { patient: Patient };

export const usePrescriptions = (
  filters?: {
    search?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    patientId?: string;
    limit?: number;
  },
  options?: Omit<
    UseQueryOptions<PrescriptionListRow[], APIRequestError>,
    "queryKey" | "queryFn"
  >,
) =>
  useAPIQuery<PrescriptionListRow[], APIRequestError>(
    queryKeys.prescriptions.list(filters),
    withQueryString("/prescriptions", filters),
    { gcTime: 5 * 60 * 1000, ...options },
  );

export const usePatientPrescriptions = (
  patientId: string,
  options?: { limit?: number },
  queryOptions?: { enabled?: boolean },
) => {
  return useAPIQuery<(Prescription & { patient: Patient })[]>(
    queryKeys.prescriptions.byPatient(patientId),
    withQueryString("/prescriptions", {
      patientId,
      limit: options?.limit,
    }),
    queryOptions,
  );
};

export const usePrescription = (id: string) =>
  useAPIQuery<Prescription & { patient: Patient }>(
    queryKeys.prescriptions.detail(id),
    `/prescriptions/${id}`,
  );

export const useCreatePrescription = () =>
  useAPIMutation<Prescription, CreatePrescriptionRequest>(
    "/prescriptions",
    "POST",
    {
      invalidateKeys: [queryKeys.prescriptions.all()],
    },
  );

export const useUpdatePrescription = (id: string) =>
  useAPIMutation<Prescription, Partial<Prescription>>(
    `/prescriptions/${id}`,
    "PATCH",
    {
      invalidateKeys: [
        queryKeys.prescriptions.all(),
        queryKeys.prescriptions.detail(id),
      ],
    },
  );

export const useDeletePrescription = (id: string) =>
  useAPIMutation<void, void>(`/prescriptions/${id}`, "DELETE", {
    invalidateKeys: [queryKeys.prescriptions.all()],
  });

export const useDownloadPrescriptionPDF = () =>
  usePollPdfJob(
    "/prescriptions",
    (id, jobId) =>
      `/prescriptions/${id}/pdf/status?jobId=${jobId}`,
  );
