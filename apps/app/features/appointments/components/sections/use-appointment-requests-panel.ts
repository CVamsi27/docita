"use client";

import { useMemo, useState } from "react";
import type { DataStateStatus } from "@workspace/ui/components/data-display/data-state";
import type { AppointmentRequestResponse } from "@workspace/types";
import { DEFAULT_TIMEZONE } from "@workspace/utils";
import {
  useAppointmentRequests,
  useApproveAppointmentRequest,
  useRejectAppointmentRequest,
  useDoctors,
} from "@workspace/data-access";
import { useClinic } from "@/lib/contexts/clinic-context";
import {
  useApproveRequestAction,
  useRejectRequestAction,
} from "./use-appointment-requests-panel-actions";
import type {
  AppointmentRequestQueries,
  ApproveFieldErrorsByRequest,
  DoctorOption,
  RequestFormState,
  RequestTextById,
} from "./use-appointment-requests-panel-types";
export function useAppointmentRequestsPanel() {
  const { clinic } = useClinic();
  const clinicTz = clinic?.timezone?.trim() || DEFAULT_TIMEZONE;
  const [showPastRequests, setShowPastRequests] = useState(false);
  const queries = useAppointmentRequestQueries(showPastRequests);
  const { data: doctors = [] } = useDoctors();
  const approveRequest = useApproveAppointmentRequest();
  const rejectRequest = useRejectAppointmentRequest();
  const formState = useRequestFormState();
  const [slotSuggestionGeneration, setSlotSuggestionGeneration] = useState(0);
  const [hiddenRequestIds, setHiddenRequestIds] = useState<Set<string>>(
    () => new Set(),
  );
  const doctorOptions = useDoctorOptions(doctors);
  const sortedRequests = useSortedPendingRequests(
    queries.data?.items,
    hiddenRequestIds,
  );
  const pastRequests = usePastRequests(
    queries.approvedRequestsData?.items,
    queries.rejectedRequestsData?.items,
  );
  const handleApprove = useApproveRequestAction({
    clinicTz,
    formState,
    doctorOptions,
    approveRequest,
    showPastRequests,
    refetch: queries.refetch,
    refetchApprovedRequests: queries.refetchApprovedRequests,
    setHiddenRequestIds,
    setSlotSuggestionGeneration,
  });
  const handleReject = useRejectRequestAction({
    formState,
    rejectRequest,
    showPastRequests,
    refetch: queries.refetch,
    refetchRejectedRequests: queries.refetchRejectedRequests,
    setHiddenRequestIds,
    setSlotSuggestionGeneration,
  });
  return {
    pendingCount: queries.data?.count ?? 0,
    state: getPendingRequestsState(queries, sortedRequests.length),
    pastState: getPastRequestsState(queries, pastRequests.length),
    sortedRequests,
    pastRequests,
    showPastRequests,
    setShowPastRequests,
    doctorOptions,
    ...formState,
    slotSuggestionGeneration,
    clinicTz,
    isMutating: approveRequest.isPending || rejectRequest.isPending,
    handleApprove,
    handleReject,
    refetch: queries.refetch,
    refetchApprovedRequests: queries.refetchApprovedRequests,
    refetchRejectedRequests: queries.refetchRejectedRequests,
  };
}
function useAppointmentRequestQueries(
  showPastRequests: boolean,
): AppointmentRequestQueries {
  const { data, isLoading, isError, refetch } = useAppointmentRequests({
    status: "PENDING",
    limit: 50,
  });
  const {
    data: approvedRequestsData,
    isLoading: isApprovedRequestsLoading,
    isError: isApprovedRequestsError,
    refetch: refetchApprovedRequests,
  } = useAppointmentRequests(
    showPastRequests ? { status: "APPROVED", limit: 25 } : null,
  );
  const {
    data: rejectedRequestsData,
    isLoading: isRejectedRequestsLoading,
    isError: isRejectedRequestsError,
    refetch: refetchRejectedRequests,
  } = useAppointmentRequests(
    showPastRequests ? { status: "REJECTED", limit: 25 } : null,
  );
  return {
    data,
    isLoading,
    isError,
    refetch,
    approvedRequestsData,
    isApprovedRequestsLoading,
    isApprovedRequestsError,
    refetchApprovedRequests,
    rejectedRequestsData,
    isRejectedRequestsLoading,
    isRejectedRequestsError,
    refetchRejectedRequests,
  };
}

function useRequestFormState(): RequestFormState {
  const [doctorByRequest, setDoctorByRequest] = useState<RequestTextById>({});
  const [startByRequest, setStartByRequest] = useState<RequestTextById>({});
  const [rejectReasonByRequest, setRejectReasonByRequest] =
    useState<RequestTextById>({});
  const [rejectCustomByRequest, setRejectCustomByRequest] =
    useState<RequestTextById>({});
  const [approveFieldErrorsByRequest, setApproveFieldErrorsByRequest] =
    useState<ApproveFieldErrorsByRequest>({});
  return {
    doctorByRequest,
    setDoctorByRequest,
    startByRequest,
    setStartByRequest,
    rejectReasonByRequest,
    setRejectReasonByRequest,
    rejectCustomByRequest,
    setRejectCustomByRequest,
    approveFieldErrorsByRequest,
    setApproveFieldErrorsByRequest,
  };
}

function useDoctorOptions(
  doctors: ReturnType<typeof useDoctors>["data"] = [],
): DoctorOption[] {
  return useMemo(
    () =>
      doctors.filter((doctor) =>
        ["DOCTOR", "ADMIN_DOCTOR"].includes(String(doctor.role)),
      ),
    [doctors],
  );
}

function useSortedPendingRequests(
  items: AppointmentRequestResponse[] | undefined,
  hiddenRequestIds: Set<string>,
) {
  return useMemo(() => {
    return [...(items ?? [])]
      .filter((r) => !hiddenRequestIds.has(r.id))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [items, hiddenRequestIds]);
}

function usePastRequests(
  approvedItems: AppointmentRequestResponse[] | undefined,
  rejectedItems: AppointmentRequestResponse[] | undefined,
) {
  return useMemo(() => {
    const items = [...(approvedItems ?? []), ...(rejectedItems ?? [])];
    const uniqueItems = Array.from(
      new Map(items.map((item) => [item.id, item])).values(),
    );
    return uniqueItems.sort((a, b) => {
      const aTime = new Date(a.reviewedAt ?? a.updatedAt).getTime();
      const bTime = new Date(b.reviewedAt ?? b.updatedAt).getTime();
      return bTime - aTime;
    });
  }, [approvedItems, rejectedItems]);
}

function getPendingRequestsState(
  queries: AppointmentRequestQueries,
  visibleRequestCount: number,
): DataStateStatus {
  if (queries.isLoading) return "loading";
  if (queries.isError) return "error";
  return visibleRequestCount === 0 ? "empty" : "success";
}

function getPastRequestsState(
  queries: AppointmentRequestQueries,
  visibleRequestCount: number,
): DataStateStatus {
  if (queries.isApprovedRequestsLoading || queries.isRejectedRequestsLoading) return "loading";
  if (queries.isApprovedRequestsError || queries.isRejectedRequestsError) return "error";
  return visibleRequestCount === 0 ? "empty" : "success";
}
