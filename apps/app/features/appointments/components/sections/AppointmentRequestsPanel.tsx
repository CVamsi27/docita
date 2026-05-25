"use client";

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
import { AppointmentRequestRow } from "./requests/AppointmentRequestRow";
import { AppointmentRequestPastRow } from "./appointment-request-past-row";
import { useAppointmentRequestsPanel } from "./use-appointment-requests-panel";

function patientPhone(request: AppointmentRequestResponse): string | null {
  const raw = request.patient?.phoneNumber;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

function schedulingSummaryLines(request: AppointmentRequestResponse): {
  primary: string;
} {
  const slotStart = request.requestedSlotStart
    ? new Date(request.requestedSlotStart)
    : null;
  const slotEnd = request.requestedSlotEnd
    ? new Date(request.requestedSlotEnd)
    : null;
  const hasSlot =
    slotStart &&
    slotEnd &&
    !Number.isNaN(slotStart.getTime()) &&
    !Number.isNaN(slotEnd.getTime());

  if (hasSlot) {
    const dayLabel = formatLocaleDateShortMonthYear(slotStart);
    const range = `${formatClockTime(slotStart)} – ${formatClockTime(slotEnd)}`;
    return {
      primary: `Requested slot · ${dayLabel} · ${range}`,
    };
  }

  const pref = new Date(request.preferredDate);
  const prefOk = !Number.isNaN(pref.getTime());
  let primary = prefOk
    ? `Preferred date · ${formatLocaleDateShortMonthYear(pref)}`
    : "Preferred date not set";
  if (request.preferredTime && /^\d{2}:\d{2}$/.test(request.preferredTime)) {
    primary += ` at ${request.preferredTime}`;
  }
  return { primary };
}

type SchedulableDoctor = { id: string; name: string | null; role: string };

interface AppointmentRequestRowProps {
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
  endByRequest: Record<string, string>;
  setEndByRequest: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  responseByRequest: Record<string, string>;
  setResponseByRequest: React.Dispatch<
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

function AppointmentRequestRow({
  request,
  doctorOptions,
  doctorByRequest,
  setDoctorByRequest,
  startByRequest,
  setStartByRequest,
  endByRequest,
  setEndByRequest,
  responseByRequest,
  setResponseByRequest,
  onApprove,
  onReject,
  isMutating,
  approveFieldErrors,
  onClearApproveFieldErrors,
  clinicTimezone,
  slotSuggestionGeneration,
}: AppointmentRequestRowProps) {
  const effectiveDoctorId =
    doctorByRequest[request.id] ??
    request.preferredDoctorId ??
    doctorOptions[0]?.id ??
    "";

  const hasStructuredSlot = Boolean(
    request.requestedSlotStart &&
      request.requestedSlotEnd &&
      utcRequestedSlotToWallLocal(
        request.requestedSlotStart,
        clinicTimezone,
      ) &&
      utcRequestedSlotToWallLocal(request.requestedSlotEnd, clinicTimezone),
  );

  useEffect(() => {
    if (!effectiveDoctorId || hasStructuredSlot) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const win = await fetchNextAvailableSlotWindow(
        request.preferredDate,
        effectiveDoctorId,
        clinicTimezone,
      );
      if (cancelled || !win) {
        return;
      }
      setStartByRequest((prev) => ({
        ...prev,
        [request.id]: win.startLocal,
      }));
      setEndByRequest((prev) => ({
        ...prev,
        [request.id]: win.endLocal,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [
    request.id,
    request.preferredDate,
    effectiveDoctorId,
    hasStructuredSlot,
    request.requestedSlotStart,
    request.requestedSlotEnd,
    setStartByRequest,
    setEndByRequest,
    clinicTimezone,
    slotSuggestionGeneration,
  ]);

  const structuredStart = utcRequestedSlotToWallLocal(
    request.requestedSlotStart,
    clinicTimezone,
  );
  const structuredEnd = utcRequestedSlotToWallLocal(
    request.requestedSlotEnd,
    clinicTimezone,
  );
  const fallbackStart = preferredDateTimeWallLocal(
    request.preferredDate,
    request.preferredTime,
    clinicTimezone,
  );

  const startValue =
    startByRequest[request.id] ?? structuredStart ?? fallbackStart;
  const endValue =
    endByRequest[request.id] ??
    structuredEnd ??
    addMinutesToClinicWallDatetimeLocal(startValue, 30, clinicTimezone) ??
    startValue;

  const summary = schedulingSummaryLines(request);
  const phone = patientPhone(request);
  const preferredDoctorLabel =
    request.preferredDoctor?.name?.trim() || null;
  const arrivalClinic = formatClinicFriendlyDateTime(
    request.createdAt,
    clinicTimezone,
  );
  const arrivalRelative = formatDistanceToNow(request.createdAt);

  return (
    <div className="rounded-md border border-border/70 bg-card/40 p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/50 pb-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-[length:var(--fs-sm)] font-medium leading-snug text-foreground">
              {patientName(request)}
            </p>
            {phone ? (
              <span className="text-[length:var(--fs-xs)] text-muted-foreground">
                {phone}
              </span>
            ) : null}
          </div>
          <p className="text-[length:var(--fs-xs)] text-muted-foreground">
            <span className="font-medium text-foreground/85">Received</span>
            {arrivalClinic ? (
              <>
                {" "}
                <span className="tabular-nums">{arrivalClinic}</span>
                {arrivalRelative ? (
                  <span className="text-muted-foreground">
                    {" "}
                    ({arrivalRelative})
                  </span>
                ) : null}
              </>
            ) : null}
          </p>
          <p className="line-clamp-2 text-[length:var(--fs-xs)] leading-snug text-muted-foreground">
            {request.reason}
          </p>
          {request.notes ? (
            <p className="line-clamp-1 text-[length:var(--fs-xs)] text-muted-foreground">
              <span className="font-medium text-foreground/80">Notes</span>
              {": "}
              {request.notes}
            </p>
          ) : null}
          <p className="text-[length:var(--fs-xs)] leading-snug text-muted-foreground">
            {summary.primary}
            {preferredDoctorLabel ? (
              <span className="block sm:inline sm:before:content-['·_'] sm:before:font-normal">
                Preferred doctor · {preferredDoctorLabel}
              </span>
            ) : null}
          </p>
        </div>
        <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[length:var(--fs-2xs)]">
          {request.status}
        </Badge>
      </div>

      <div className="space-y-2 pt-2">
        <MicroLabel as="p" className="text-[length:var(--fs-2xs)]">
          Approve booking
        </MicroLabel>
        <p className="text-[length:var(--fs-xs)] leading-snug text-muted-foreground">
          Suggested start/end refresh when another request is approved or slot
          availability changes.
        </p>
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="min-w-[11rem] flex-1 space-y-1">
            <Label
              htmlFor={`apr-doctor-${request.id}`}
              className="text-[length:var(--fs-xs)] font-normal text-muted-foreground"
            >
              Doctor
            </Label>
            <select
              id={`apr-doctor-${request.id}`}
              className={cn(
                "flex h-8 w-full rounded-md border bg-background px-2 text-[length:var(--fs-xs)] shadow-sm",
                approveFieldErrors?.doctorId
                  ? "border-destructive aria-invalid:border-destructive"
                  : "border-input",
              )}
              aria-invalid={approveFieldErrors?.doctorId ? true : undefined}
              aria-describedby={
                approveFieldErrors?.doctorId
                  ? `apr-doctor-err-${request.id}`
                  : undefined
              }
              value={
                doctorByRequest[request.id] ??
                request.preferredDoctorId ??
                doctorOptions[0]?.id ??
                ""
              }
              onChange={(event) => {
                onClearApproveFieldErrors();
                const value = event.target.value;
                setDoctorByRequest((prev) => ({
                  ...prev,
                  [request.id]: value,
                }));
                setStartByRequest((prev) => {
                  const next = { ...prev };
                  delete next[request.id];
                  return next;
                });
                setEndByRequest((prev) => {
                  const next = { ...prev };
                  delete next[request.id];
                  return next;
                });
              }}
            >
              {doctorOptions.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>
            {approveFieldErrors?.doctorId ? (
              <p
                id={`apr-doctor-err-${request.id}`}
                className="text-[length:var(--fs-xs)] text-destructive"
              >
                {approveFieldErrors.doctorId}
              </p>
            ) : null}
          </div>
          <div className="min-w-[10.5rem] flex-1 space-y-1">
            <Label
              htmlFor={`apr-start-${request.id}`}
              className="text-[length:var(--fs-xs)] font-normal text-muted-foreground"
            >
              Start
            </Label>
            <Input
              id={`apr-start-${request.id}`}
              type="datetime-local"
              value={startValue}
              onChange={(event) => {
                onClearApproveFieldErrors();
                setStartByRequest((prev) => ({
                  ...prev,
                  [request.id]: event.target.value,
                }));
              }}
              aria-invalid={approveFieldErrors?.startTime ? true : undefined}
              aria-describedby={
                approveFieldErrors?.startTime
                  ? `apr-start-err-${request.id}`
                  : undefined
              }
              className={cn(
                "h-8 px-2 text-[length:var(--fs-xs)]",
                approveFieldErrors?.startTime &&
                  "border-destructive aria-invalid:border-destructive",
              )}
            />
            {approveFieldErrors?.startTime ? (
              <p
                id={`apr-start-err-${request.id}`}
                className="text-[length:var(--fs-xs)] text-destructive"
              >
                {approveFieldErrors.startTime}
              </p>
            ) : null}
          </div>
          <div className="min-w-[10.5rem] flex-1 space-y-1">
            <Label
              htmlFor={`apr-end-${request.id}`}
              className="text-[length:var(--fs-xs)] font-normal text-muted-foreground"
            >
              End
            </Label>
            <Input
              id={`apr-end-${request.id}`}
              type="datetime-local"
              value={endValue}
              onChange={(event) => {
                onClearApproveFieldErrors();
                setEndByRequest((prev) => ({
                  ...prev,
                  [request.id]: event.target.value,
                }));
              }}
              aria-invalid={approveFieldErrors?.endTime ? true : undefined}
              aria-describedby={
                approveFieldErrors?.endTime
                  ? `apr-end-err-${request.id}`
                  : undefined
              }
              className={cn(
                "h-8 px-2 text-[length:var(--fs-xs)]",
                approveFieldErrors?.endTime &&
                  "border-destructive aria-invalid:border-destructive",
              )}
            />
            {approveFieldErrors?.endTime ? (
              <p
                id={`apr-end-err-${request.id}`}
                className="text-[length:var(--fs-xs)] text-destructive"
              >
                {approveFieldErrors.endTime}
              </p>
            ) : null}
          </div>
          <div className="flex w-full shrink-0 lg:w-auto lg:max-w-[9rem]">
            <Button
              size="sm"
              className="h-8 w-full gap-1.5"
              disabled={isMutating}
              onClick={() => void onApprove(request)}
            >
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Approve
            </Button>
          </div>
        </div>
      </div>

      <Separator className="my-2 bg-border/60" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <MicroLabel as="p" className="text-[length:var(--fs-2xs)]">
            Reject
          </MicroLabel>
          <Label
            htmlFor={`apr-reject-${request.id}`}
            className="text-[length:var(--fs-xs)] font-normal text-muted-foreground"
          >
            Message to patient
          </Label>
          <Textarea
            id={`apr-reject-${request.id}`}
            value={responseByRequest[request.id] ?? ""}
            onChange={(event) =>
              setResponseByRequest((prev) => ({
                ...prev,
                [request.id]: event.target.value,
              }))
            }
            placeholder="Reason for rejection (sent to patient)"
            rows={2}
            className="min-h-[68px] resize-y text-[length:var(--fs-xs)]"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full shrink-0 gap-1.5 sm:w-auto sm:min-w-[6.5rem]"
          disabled={isMutating}
          onClick={() => void onReject(request)}
        >
          <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Reject
        </Button>
      </div>
    </div>
  );
}

export function AppointmentRequestsPanel() {
  const panel = useAppointmentRequestsPanel();

  return (
    <Card>
      <CardHeader className="py-3 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-[length:var(--fs-sm)] font-semibold">
            Appointment requests
          </CardTitle>
          {panel.pendingCount > 0 ? (
            <Badge
              variant="secondary"
              className="h-5 px-2 text-[length:var(--fs-2xs)]"
            >
              {panel.pendingCount} pending
            </Badge>
          ) : null}
        </div>
        <p className="text-[length:var(--fs-xs)] text-muted-foreground">
          Latest portal requests appear at the top. Suggested slots update after
          each approval.
        </p>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        <DataState
          status={panel.state}
          loadingMessage="Loading appointment requests…"
          errorMessage="We could not load appointment requests."
          onRetry={() => void panel.refetch()}
          emptyIcon={Inbox}
          emptyTitle="No pending requests"
          emptyDescription="Patient portal appointment requests will appear here"
        >
          <div className="space-y-2">
            {panel.sortedRequests.map((request) => (
              <AppointmentRequestRow
                key={request.id}
                request={request}
                doctorOptions={panel.doctorOptions}
                doctorByRequest={panel.doctorByRequest}
                setDoctorByRequest={panel.setDoctorByRequest}
                startByRequest={panel.startByRequest}
                setStartByRequest={panel.setStartByRequest}
                rejectReasonByRequest={panel.rejectReasonByRequest}
                setRejectReasonByRequest={panel.setRejectReasonByRequest}
                rejectCustomByRequest={panel.rejectCustomByRequest}
                setRejectCustomByRequest={panel.setRejectCustomByRequest}
                onApprove={panel.handleApprove}
                onReject={panel.handleReject}
                isMutating={panel.isMutating}
                approveFieldErrors={panel.approveFieldErrorsByRequest[request.id]}
                onClearApproveFieldErrors={() =>
                  panel.setApproveFieldErrorsByRequest((prev) => {
                    if (!(request.id in prev)) return prev;
                    const next = { ...prev };
                    delete next[request.id];
                    return next;
                  })
                }
                clinicTimezone={panel.clinicTz}
                slotSuggestionGeneration={panel.slotSuggestionGeneration}
              />
            ))}
          </div>
        </DataState>
        <div className="mt-3 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => panel.setShowPastRequests((v) => !v)}
          >
            {panel.showPastRequests ? "Hide past requests" : "View past requests"}
          </Button>
          {panel.showPastRequests ? (
            <div className="mt-3">
              <DataState
                status={panel.pastState}
                loadingMessage="Loading past appointment requests…"
                errorMessage="We could not load past appointment requests."
                onRetry={() => {
                  void panel.refetchApprovedRequests();
                  void panel.refetchRejectedRequests();
                }}
                emptyIcon={Inbox}
                emptyTitle="No past requests"
                emptyDescription="Approved and rejected requests will appear here"
              >
                <div className="space-y-2">
                  {panel.pastRequests.map((request) => (
                    <AppointmentRequestPastRow key={request.id} request={request} />
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
