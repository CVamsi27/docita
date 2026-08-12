import { formatDistanceToNow } from "@workspace/utils";
import type { ApproveScheduleFieldKey } from "@/lib/utils/appointment-request-approve-errors";
import type { AppointmentRequestResponse } from "@workspace/types";
import {
  REJECT_REASON_CUSTOM,
  type SchedulableDoctor,
  patientPhone,
  schedulingSummaryLines,
} from "./request-row-helpers";
import { useAppointmentRequestScheduling } from "./use-appointment-request-scheduling";

function buildApproveGating(params: {
  isMutating: boolean;
  isPast: boolean;
  isStartAllowed: boolean;
  approveFieldErrors?: Partial<Record<ApproveScheduleFieldKey, string>>;
}) {
  const { isMutating, isPast, isStartAllowed, approveFieldErrors } = params;
  const hasApproveFieldErrors = Boolean(
    approveFieldErrors &&
      (approveFieldErrors.doctorId ||
        approveFieldErrors.startTime ||
        approveFieldErrors.endTime),
  );
  const approveBlocked = isMutating || !isStartAllowed || hasApproveFieldErrors;
  const approveError =
    approveFieldErrors?.doctorId ??
    approveFieldErrors?.startTime ??
    approveFieldErrors?.endTime ??
    (isPast ? "Start time is in the past." : null) ??
    (!isStartAllowed ? "Not available for this doctor." : null);
  return { hasApproveFieldErrors, approveBlocked, approveError };
}

export interface UseAppointmentRequestRowInput {
  request: AppointmentRequestResponse;
  doctorOptions: SchedulableDoctor[];
  doctorByRequest: Record<string, string>;
  setDoctorByRequest: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  startByRequest: Record<string, string>;
  setStartByRequest: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  rejectReasonByRequest: Record<string, string>;
  setRejectReasonByRequest: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  rejectCustomByRequest: Record<string, string>;
  setRejectCustomByRequest: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  onApprove: (request: AppointmentRequestResponse) => void | Promise<void>;
  onReject: (request: AppointmentRequestResponse) => void | Promise<void>;
  isMutating: boolean;
  approveFieldErrors?: Partial<Record<ApproveScheduleFieldKey, string>>;
  onClearApproveFieldErrors: () => void;
  clinicTimezone: string;
  slotSuggestionGeneration: number;
}

/**
 * View-model for a single appointment-request row. Composes the schedulable
 * slot derivation (`useAppointmentRequestScheduling`) with the row's
 * approve-gating, reject-form state, and display/summary fields, returning
 * the single flat shape `AppointmentRequestRow` consumes.
 */
export function useAppointmentRequestRow(input: UseAppointmentRequestRowInput) {
  const {
    request,
    doctorOptions,
    doctorByRequest,
    setDoctorByRequest,
    startByRequest,
    setStartByRequest,
    rejectReasonByRequest,
    setRejectReasonByRequest,
    rejectCustomByRequest,
    setRejectCustomByRequest,
    onApprove,
    onReject,
    isMutating,
    approveFieldErrors,
    onClearApproveFieldErrors,
    clinicTimezone,
    slotSuggestionGeneration,
  } = input;

  const scheduling = useAppointmentRequestScheduling({
    request,
    doctorOptions,
    doctorByRequest,
    startByRequest,
    setStartByRequest,
    clinicTimezone,
    slotSuggestionGeneration,
  });

  const { hasApproveFieldErrors, approveBlocked, approveError } =
    buildApproveGating({
      isMutating,
      isPast: scheduling.isPast,
      isStartAllowed: scheduling.isStartAllowed,
      approveFieldErrors,
    });

  const summary = schedulingSummaryLines(request);
  const phone = patientPhone(request);
  const preferredDoctorLabel = request.preferredDoctor?.name?.trim() || null;
  const arrivalRelative = formatDistanceToNow(request.createdAt);

  const rejectReason = rejectReasonByRequest[request.id] ?? "";
  const rejectCustom = rejectCustomByRequest[request.id] ?? "";
  const canSubmitReject =
    rejectReason.length > 0 &&
    (rejectReason !== REJECT_REASON_CUSTOM || rejectCustom.trim().length > 0);

  return {
    ...scheduling,
    summary,
    phone,
    preferredDoctorLabel,
    arrivalRelative,
    hasApproveFieldErrors,
    approveBlocked,
    approveError,
    rejectReason,
    rejectCustom,
    canSubmitReject,
    onApprove,
    onReject,
    isMutating,
    approveFieldErrors,
    onClearApproveFieldErrors,
    clinicTimezone,
    setDoctorByRequest,
    setStartByRequest,
    setRejectReasonByRequest,
    setRejectCustomByRequest,
    doctorOptions,
    request,
  };
}
