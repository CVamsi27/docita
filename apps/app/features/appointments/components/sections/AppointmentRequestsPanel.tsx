"use client";

import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import type { AppointmentRequestResponse } from "@workspace/types";
import { DEFAULT_TIMEZONE, formatDistanceToNow } from "@workspace/utils";
import {
  useAppointmentRequests,
  useApproveAppointmentRequest,
  useRejectAppointmentRequest,
} from "@workspace/data-access";
import { useDoctors } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  extractApproveAppointmentRequestFieldErrors,
  type ApproveScheduleFieldKey,
} from "@/lib/utils/appointment-request-approve-errors";
import { extractProblemDetail } from "@/lib/utils/api-validation-errors";
import { getSafeUserMessage } from "@/lib/errors/user-facing-errors";
import { useClinic } from "@/lib/contexts/clinic-context";
import { AppointmentRequestRow } from "./requests/AppointmentRequestRow";
import { patientName } from "./requests/request-row-helpers";
import { resolveApprovalWindow } from "./requests/approval-window-helpers";

function PastRequestRow({
  request,
}: {
  request: AppointmentRequestResponse;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[length:var(--fs-sm)] font-medium">
              {patientName(request)}
            </span>
            <Badge
              variant={request.status === "APPROVED" ? "default" : "secondary"}
              className="h-5 px-2 text-[length:var(--fs-2xs)]"
            >
              {request.status === "APPROVED" ? "Approved" : "Rejected"}
            </Badge>
          </div>
          <div className="mt-1 text-[length:var(--fs-xs)] text-muted-foreground">
            {request.responseMessage ?? request.reason ?? "Action recorded"}
          </div>
        </div>
        <div className="text-right text-[length:var(--fs-xs)] text-muted-foreground">
          {formatDistanceToNow(request.reviewedAt ?? request.updatedAt)}
        </div>
      </div>
    </div>
  );
}

export function AppointmentRequestsPanel() {
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

  const [doctorByRequest, setDoctorByRequest] = useState<Record<string, string>>({});
  const [startByRequest, setStartByRequest] = useState<Record<string, string>>({});
  const [rejectReasonByRequest, setRejectReasonByRequest] = useState<Record<string, string>>({});
  const [rejectCustomByRequest, setRejectCustomByRequest] = useState<Record<string, string>>({});
  const [approveFieldErrorsByRequest, setApproveFieldErrorsByRequest] = useState<
    Record<string, Partial<Record<ApproveScheduleFieldKey, string>>>
  >({});
  const [slotSuggestionGeneration, setSlotSuggestionGeneration] = useState(0);
  const [hiddenRequestIds, setHiddenRequestIds] = useState<Set<string>>(() => new Set());

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

  const state = isLoading
    ? "loading"
    : isError
      ? "error"
      : sortedRequests.length === 0
        ? "empty"
        : "success";

  const pastState =
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
        [request.id]: { doctorId: "Select a doctor before approving this request." },
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

  return (
    <Card>
      <CardHeader className="py-3 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-[length:var(--fs-sm)] font-semibold">
            Appointment requests
          </CardTitle>
          {(data?.count ?? 0) > 0 ? (
            <Badge variant="secondary" className="h-5 px-2 text-[length:var(--fs-2xs)]">
              {data?.count} pending
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        <DataState
          status={state}
          loadingMessage="Loading appointment requests…"
          errorMessage="We could not load appointment requests."
          onRetry={() => void refetch()}
          emptyIcon={Inbox}
          emptyTitle="No pending requests"
          emptyDescription="Patient portal appointment requests will appear here"
        >
          <div className="space-y-2">
            {sortedRequests.map((request) => (
              <AppointmentRequestRow
                key={request.id}
                request={request}
                doctorOptions={doctorOptions}
                doctorByRequest={doctorByRequest}
                setDoctorByRequest={setDoctorByRequest}
                startByRequest={startByRequest}
                setStartByRequest={setStartByRequest}
                rejectReasonByRequest={rejectReasonByRequest}
                setRejectReasonByRequest={setRejectReasonByRequest}
                rejectCustomByRequest={rejectCustomByRequest}
                setRejectCustomByRequest={setRejectCustomByRequest}
                onApprove={handleApprove}
                onReject={handleReject}
                isMutating={isMutating}
                approveFieldErrors={approveFieldErrorsByRequest[request.id]}
                onClearApproveFieldErrors={() =>
                  setApproveFieldErrorsByRequest((prev) => {
                    if (!(request.id in prev)) return prev;
                    const next = { ...prev };
                    delete next[request.id];
                    return next;
                  })
                }
                clinicTimezone={clinicTz}
                slotSuggestionGeneration={slotSuggestionGeneration}
              />
            ))}
          </div>
        </DataState>
        <div className="mt-3 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPastRequests((v) => !v)}
          >
            {showPastRequests ? "Hide past requests" : "View past requests"}
          </Button>
          {showPastRequests ? (
            <div className="mt-3">
              <DataState
                status={pastState}
                loadingMessage="Loading past appointment requests…"
                errorMessage="We could not load past appointment requests."
                onRetry={() => {
                  void refetchApprovedRequests();
                  void refetchRejectedRequests();
                }}
                emptyIcon={Inbox}
                emptyTitle="No past requests"
                emptyDescription="Approved and rejected requests will appear here"
              >
                <div className="space-y-2">
                  {pastRequests.map((request) => (
                    <PastRequestRow key={request.id} request={request} />
                  ))}
                </div>
              </DataState>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
