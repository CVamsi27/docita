"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { AppointmentRequestResponse } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { getSafeUserMessage } from "@/lib/errors/user-facing-errors";
import { extractProblemDetail } from "@/lib/utils/api-validation-errors";
import { extractApproveAppointmentRequestFieldErrors } from "@/lib/utils/appointment-request-approve-errors";
import { resolveApprovalWindow } from "./requests/approval-window-helpers";
import type {
  AppointmentRequestQueries,
  DoctorOption,
  RequestFormState,
} from "./use-appointment-requests-panel-types";
import type {
  useApproveAppointmentRequest,
  useRejectAppointmentRequest,
} from "@workspace/data-access";

const REJECT_REASON_CUSTOM = "CUSTOM";

export function useApproveRequestAction(params: {
  clinicTz: string;
  formState: RequestFormState;
  doctorOptions: DoctorOption[];
  approveRequest: ReturnType<typeof useApproveAppointmentRequest>;
  showPastRequests: boolean;
  refetch: AppointmentRequestQueries["refetch"];
  refetchApprovedRequests: AppointmentRequestQueries["refetchApprovedRequests"];
  setHiddenRequestIds: Dispatch<SetStateAction<Set<string>>>;
  setSlotSuggestionGeneration: Dispatch<SetStateAction<number>>;
}) {
  const {
    clinicTz,
    formState,
    doctorOptions,
    approveRequest,
    showPastRequests,
    refetch,
    refetchApprovedRequests,
    setHiddenRequestIds,
    setSlotSuggestionGeneration,
  } = params;
  return useCallback(async (request: AppointmentRequestResponse) => {
    formState.setApproveFieldErrorsByRequest((prev) => {
      const next = { ...prev };
      delete next[request.id];
      return next;
    });
    const doctorId =
      formState.doctorByRequest[request.id] ??
      request.preferredDoctorId ??
      doctorOptions[0]?.id;
    const window = await resolveApprovalWindow({
      request,
      doctorId,
      manualStartLocal: formState.startByRequest[request.id],
      clinicTz,
    });
    if (window.kind === "missing-doctor") {
      formState.setApproveFieldErrorsByRequest((prev) => ({
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
    if (!doctorId) return;
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
      resetRequestDraftState(formState);
      void refetch();
      if (showPastRequests) void refetchApprovedRequests();
    } catch (error) {
      const fieldErrors = extractApproveAppointmentRequestFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        formState.setApproveFieldErrorsByRequest((prev) => ({
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
  }, [
    approveRequest,
    clinicTz,
    doctorOptions,
    formState,
    refetch,
    refetchApprovedRequests,
    setHiddenRequestIds,
    setSlotSuggestionGeneration,
    showPastRequests,
  ]);
}

export function useRejectRequestAction(params: {
  formState: RequestFormState;
  rejectRequest: ReturnType<typeof useRejectAppointmentRequest>;
  showPastRequests: boolean;
  refetch: AppointmentRequestQueries["refetch"];
  refetchRejectedRequests: AppointmentRequestQueries["refetchRejectedRequests"];
  setHiddenRequestIds: Dispatch<SetStateAction<Set<string>>>;
  setSlotSuggestionGeneration: Dispatch<SetStateAction<number>>;
}) {
  const {
    formState,
    rejectRequest,
    showPastRequests,
    refetch,
    refetchRejectedRequests,
    setHiddenRequestIds,
    setSlotSuggestionGeneration,
  } = params;
  return useCallback(async (request: AppointmentRequestResponse) => {
    const reason = formState.rejectReasonByRequest[request.id]?.trim();
    const responseMessage =
      reason === REJECT_REASON_CUSTOM
        ? (formState.rejectCustomByRequest[request.id] ?? "").trim()
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
      resetRequestDraftState(formState);
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
  }, [
    formState,
    refetch,
    refetchRejectedRequests,
    rejectRequest,
    setHiddenRequestIds,
    setSlotSuggestionGeneration,
    showPastRequests,
  ]);
}

function resetRequestDraftState(formState: RequestFormState): void {
  formState.setStartByRequest({});
  formState.setRejectReasonByRequest({});
  formState.setRejectCustomByRequest({});
}
