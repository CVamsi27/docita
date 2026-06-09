"use client";

import {
  DiagnosesSyncResponse,
  StartConsultationResponse,
} from "@workspace/types";
import { useAPIMutation } from "../../core/use-api-mutation";
import { queryKeys } from "../../lib/query-keys-clinician";

export interface DiagnosisSyncItem {
  icdCodeId?: string;
  notes?: string;
  isPrimary?: boolean;
}

export interface DiagnosesSyncRequestBody {
  diagnoses: DiagnosisSyncItem[];
  contentHash?: string;
}

export const useStartConsultation = () =>
  useAPIMutation<StartConsultationResponse, { appointmentId: string }>(
    ({ appointmentId }) => `/appointments/${appointmentId}/start-consultation`,
    "POST",
    {
      invalidateKeys: [queryKeys.appointments.all(), queryKeys.queue.all()],
    },
  );

export const useSyncDiagnoses = (appointmentId: string) =>
  useAPIMutation<DiagnosesSyncResponse, DiagnosesSyncRequestBody>(
    `/appointments/${appointmentId}/diagnoses`,
    "POST",
    {
      invalidateKeys: [
        queryKeys.appointments.detail(appointmentId),
        queryKeys.codingQueue.list(),
      ],
    },
  );

