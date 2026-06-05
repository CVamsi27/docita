"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useLabQueue,
  useRecordSampleCollection,
  useReleaseLabResult,
  useUploadLabResult,
  useVerifyLabOrderPayment,
  type LabQueueItem,
} from "@workspace/data-access";
import type { VerifyLabOrderPaymentRequest } from "@workspace/types";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export type LabQueueStatusFilter =
  | "all"
  | "ORDERED"
  | "SAMPLE_COLLECTED"
  | "PENDING"
  | "RESULT_READY"
  | "COMPLETED"
  | "CANCELLED";

/**
 * Lab workspace state + actions: the queue of assigned orders and the
 * sample → result → payment → release transitions. Rendering lives in the
 * workspace components.
 */
export function useLabWorkspace(options?: { canVerifyPayment?: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LabQueueStatusFilter>("all");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    data: queue = [],
    isLoading,
    isFetching,
    refetch,
    isError,
  } = useLabQueue({
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== "all" && { status: statusFilter }),
  });

  const recordSample = useRecordSampleCollection();
  const uploadResult = useUploadLabResult();
  const verifyPayment = useVerifyLabOrderPayment();
  const releaseResult = useReleaseLabResult();

  const status = useMemo<"loading" | "error" | "empty" | "success">(() => {
    if (isLoading) return "loading";
    if (isError) return "error";
    if (queue.length === 0) return "empty";
    return "success";
  }, [isLoading, isError, queue.length]);

  const handleRecordSample = (item: LabQueueItem) => {
    recordSample.mutate(
      { id: item.id },
      {
        onSuccess: () => toast.success("Sample marked as received"),
        onError: (error) => showUserFacingErrorToast(error),
      },
    );
  };

  const handleUploadResult = (item: LabQueueItem, file: File) => {
    uploadResult.mutate(
      { id: item.id, file },
      {
        onSuccess: () => toast.success("Result uploaded"),
        onError: (error) => showUserFacingErrorToast(error),
      },
    );
  };

  const handleVerifyPayment = (
    item: LabQueueItem,
    payload: VerifyLabOrderPaymentRequest,
  ) => {
    verifyPayment.mutate(
      { id: item.id, ...payload },
      {
        onSuccess: () =>
          toast.success("Payment verified. Releasing results to the patient."),
        onError: (error) => showUserFacingErrorToast(error),
      },
    );
  };

  const handleRelease = (item: LabQueueItem) => {
    releaseResult.mutate(
      { id: item.id },
      {
        onSuccess: () => toast.success("Results sent to the patient on WhatsApp"),
        onError: (error) => showUserFacingErrorToast(error),
      },
    );
  };

  return {
    queue,
    status,
    isFetching,
    refetch,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    canVerifyPayment: options?.canVerifyPayment ?? false,
    handleRecordSample,
    handleUploadResult,
    handleVerifyPayment,
    handleRelease,
    isMutating:
      recordSample.isPending ||
      uploadResult.isPending ||
      verifyPayment.isPending ||
      releaseResult.isPending,
  };
}
