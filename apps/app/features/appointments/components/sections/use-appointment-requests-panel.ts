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
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  extractApproveAppointmentRequestFieldErrors,
  type ApproveScheduleFieldKey,
} from "@/lib/utils/appointment-request-approve-errors";
import { extractProblemDetail } from "@/lib/utils/api-validation-errors";
import { getSafeUserMessage } from "@/lib/errors/user-facing-errors";
import { useClinic } from "@/lib/contexts/clinic-context";
import { resolveApprovalWindow } from "./requests/approval-window-helpers";

export function useAppointmentRequestsPanel() {
  const { clinic } = useClinic();
  const clinicTz = clinic?.timezone?.trim() || DEFAULT_TIMEZONE;
  const [showPastRequests, setShowPastRequests] = useState(false);

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

  const { data: doctors = [] } = useDoctors();
  const approveRequest = useApproveAppointmentRequest();
  const rejectRequest = useRejectAppointmentRequest();

  const [doctorByRequest, setDoctorByRequest] = useState<
    Record<string, string>
  >({});
  const [startByRequest, setStartByRequest] = useState<Record<string, string>>(
    {},
  );
  const [rejectReasonByRequest, setRejectReasonByRequest] = useState<
    Record<string, string>
  >({});
  const [rejectCustomByRequest, setRejectCustomByRequest] = useState<
    Record<string, string>
  >({});
  const [approveFieldErrorsByRequest, setApproveFieldErrorsByRequest] =
    useState<Record<string, Partial<Record<ApproveScheduleFieldKey, string>>>>(
      {},
    );
  const [slotSuggestionGeneration, setSlotSuggestionGeneration] = useState(0);
  const [hiddenRequestIds, setHiddenRequestIds] = useState<Set<string>>(
    () => new Set(),
  );

  const doctorOptions = useMemo(
    () =>
      doctors.filter((doctor) =>
        ["DOCTOR", "ADMIN_DOCTOR"].includes(String(doctor.role)),
      ),
    [doctors],
  );

  const sortedRequests = useMemo(() => {
    const items = data?.items ?? [];
    return [...items]
      .filter((r) => !hiddenRequestIds.has(r.id))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [data?.items, hiddenRequestIds]);

  const pastRequests = useMemo(() => {
    const items = [
      ...(approvedRequestsData?.items ?? []),
      ...(rejectedRequestsData?.items ?? []),
    ];
    const uniqueItems = Array.from(
      new Map(items.map((item) => [item.id, item])).values(),
    );
    return uniqueItems.sort((a, b) => {
      const aTime = new Date(a.reviewedAt ?? a.updatedAt).getTime();
      const bTime = new Date(b.reviewedAt ?? b.updatedAt).getTime();
      return bTime - aTime;
    });
  }, [approvedRequestsData?.items, rejectedRequestsData?.items]);

  const state: DataStateStatus = isLoading
    ? "loading"
    : isError
      ? "error"
      : sortedRequests.length === 0
        ? "empty"
        : "success";

  const pastState: DataStateStatus =
    isApprovedRequestsLoading || isRejectedRequestsLoading
      ? "loading"
      : isApprovedRequestsError || isRejectedRequestsError
        ? "error"
        : pastRequests.length === 0
          ? "empty"
          : "success";

  const isMutating = approveRequest.isPending || rejectRequest.isPending;

  const handleApprove = async (request: AppointmentRequestResponse) => {
    setApproveFieldErrorsByRequest((prev) => {
      const next = { ...prev };
      delete next[request.id];
      return next;
    });

    const doctorId =
      doctorByRequest[request.id] ??
      request.preferredDoctorId ??
      doctorOptions[0]?.id;

    const window = await resolveApprovalWindow({
      request,
      doctorId,
      manualStartLocal: startByRequest[request.id],
      clinicTz,
    });

    if (window.kind === "missing-doctor") {
      setApproveFieldErrorsByRequest((prev) => ({
        ...prev,
        [request.id]: {
          doctorId: "Select a doctor before approving this request.",
        },
      }));
      return;
    }
    if (window.kind === "invalid-window") {
      showUserFacingErrorToast(
        null,
        "Enter valid start and end times before approving.",
        "generic",
      );
      return;
    }

    if (!doctorId) {
      return;
    }

    try {
      await approveRequest.mutateAsync({
        id: request.id,
        doctorId,
        startTime: window.startUtc,
        endTime: window.endUtc,
        type: "Consultation",
        notes: request.notes ?? request.reason,
      });
      setHiddenRequestIds((prev) => new Set([...prev, request.id]));
      setSlotSuggestionGeneration((g) => g + 1);
      setStartByRequest({});
      setRejectReasonByRequest({});
      setRejectCustomByRequest({});
      void refetch();
      if (showPastRequests) void refetchApprovedRequests();
    } catch (error) {
      const fieldErrors = extractApproveAppointmentRequestFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        setApproveFieldErrorsByRequest((prev) => ({
          ...prev,
          [request.id]: fieldErrors,
        }));
        return;
      }
      const detail = extractProblemDetail(error);
      showUserFacingErrorToast(
        null,
        getSafeUserMessage(
          detail,
          "We could not approve this appointment request. Please try again.",
        ),
        "generic",
      );
    }
  };

  const handleReject = async (request: AppointmentRequestResponse) => {
    const reason = rejectReasonByRequest[request.id]?.trim();
    const REJECT_REASON_CUSTOM = "CUSTOM";
    const responseMessage =
      reason === REJECT_REASON_CUSTOM
        ? (rejectCustomByRequest[request.id] ?? "").trim()
        : reason;
    if (!responseMessage) {
      showUserFacingErrorToast(
        null,
        "Enter a response before rejecting this request.",
        "generic",
      );
      return;
    }

    try {
      await rejectRequest.mutateAsync({ id: request.id, responseMessage });
      setHiddenRequestIds((prev) => new Set([...prev, request.id]));
      setSlotSuggestionGeneration((g) => g + 1);
      setStartByRequest({});
      setRejectReasonByRequest({});
      setRejectCustomByRequest({});
      void refetch();
      if (showPastRequests) void refetchRejectedRequests();
    } catch (error) {
      const detail = extractProblemDetail(error);
      showUserFacingErrorToast(
        null,
        getSafeUserMessage(
          detail,
          "We could not reject this appointment request. Please try again.",
        ),
        "generic",
      );
    }
  };

  return {
    pendingCount: data?.count ?? 0,
    state,
    pastState,
    sortedRequests,
    pastRequests,
    showPastRequests,
    setShowPastRequests,
    doctorOptions,
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
    slotSuggestionGeneration,
    clinicTz,
    isMutating,
    handleApprove,
    handleReject,
    refetch,
    refetchApprovedRequests,
    refetchRejectedRequests,
  };
}
