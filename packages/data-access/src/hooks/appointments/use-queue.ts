"use client";

import { Feature } from "@workspace/types";
import { useAPIQuery } from "../../core/use-api-query";
import { useAPIMutation } from "../../core/use-api-mutation";
import { queryKeys } from "../../lib/query-keys-clinician";
import { withQueryString } from "../../lib/query-string";
import { useDataAccessContext } from "../../provider/hooks";
import type { QueueItem } from "./_types-queue";

export const useQueue = (options?: { search?: string }) => {
  const queueOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.QUEUE_MANAGEMENT,
  );
  const params = options?.search ? { search: options.search } : undefined;
  return useAPIQuery<QueueItem[]>(
    queryKeys.queue.list(params),
    withQueryString("/queue", {
      search: options?.search,
    }),
    { enabled: queueOk, staleTime: 30_000, gcTime: 5 * 60 * 1000 },
  );
};

export const useQueueByDoctor = (
  doctorId?: string,
  search?: string,
  enabled: boolean = true,
) => {
  const queueOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.QUEUE_MANAGEMENT,
  );
  const params =
    doctorId || search
      ? {
          doctorId: doctorId ?? "all",
          search: search ?? "",
        }
      : undefined;
  return useAPIQuery<QueueItem[]>(
    queryKeys.queue.list(params),
    withQueryString("/queue", { doctorId, search }),
    { enabled: queueOk && enabled, staleTime: 30_000, gcTime: 5 * 60 * 1000 },
  );
};

export const useCallPatient = () =>
  useAPIMutation<QueueItem, string>(
    (queueId) => `/queue/call/${queueId}`,
    "POST",
    {
      invalidateKeys: [queryKeys.queue.all()],
    },
  );

export const useCompletePatient = () =>
  useAPIMutation<QueueItem, string>(
    (queueId) => `/queue/complete/${queueId}`,
    "POST",
    {
      invalidateKeys: [queryKeys.queue.all()],
    },
  );

export const useResetQueue = () =>
  useAPIMutation<{ success: boolean }, void>("/queue/reset", "POST", {
    invalidateKeys: [queryKeys.queue.all()],
  });
