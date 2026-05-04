"use client";

import { useMemo, useState } from "react";
import { Inbox, Check, X } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import type { AppointmentRequestResponse } from "@workspace/types";
import {
  useAppointmentRequests,
  useApproveAppointmentRequest,
  useRejectAppointmentRequest,
} from "@/hooks/api/use-appointments";
import { useDoctors } from "@/hooks/api/use-settings";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { fetchFirstAvailableDatetimeLocal } from "@/lib/doctor-availability-first-slot";
import { formatDate } from "@/lib/formatters";

function toDateTimeLocal(value: string | Date, preferredTime?: string | null) {
  const date = new Date(value);
  if (preferredTime && /^\d{2}:\d{2}$/.test(preferredTime)) {
    const [hours, minutes] = preferredTime.split(":").map(Number);
    date.setHours(hours ?? 9, minutes ?? 0, 0, 0);
  }
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function addMinutesLocal(value: string, minutes: number) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function requestedSlotToDatetimeLocal(
  requestedSlotStart: string | Date | null | undefined,
): string | null {
  if (!requestedSlotStart) return null;
  const d = new Date(requestedSlotStart);
  if (Number.isNaN(d.getTime())) return null;
  const offsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

function patientName(request: AppointmentRequestResponse) {
  const firstName = request.patient?.firstName ?? "";
  const lastName = request.patient?.lastName ?? "";
  return `${firstName} ${lastName}`.trim() || "Patient";
}

export function AppointmentRequestsPanel() {
  const { data, isLoading, isError, refetch } = useAppointmentRequests({
    status: "PENDING",
    limit: 10,
  });
  const { data: doctors = [] } = useDoctors();
  const approveRequest = useApproveAppointmentRequest();
  const rejectRequest = useRejectAppointmentRequest();
  const [doctorByRequest, setDoctorByRequest] = useState<Record<string, string>>(
    {},
  );
  const [startByRequest, setStartByRequest] = useState<Record<string, string>>(
    {},
  );
  const [endByRequest, setEndByRequest] = useState<Record<string, string>>({});
  const [responseByRequest, setResponseByRequest] = useState<
    Record<string, string>
  >({});

  const doctorOptions = useMemo(
    () =>
      doctors.filter((doctor) =>
        ["DOCTOR", "ADMIN_DOCTOR"].includes(String(doctor.role)),
      ),
    [doctors],
  );

  const requests = data?.items ?? [];
  const state = isLoading
    ? "loading"
    : isError
      ? "error"
      : requests.length === 0
        ? "empty"
        : "success";
  const isMutating = approveRequest.isPending || rejectRequest.isPending;

  const handleApprove = async (request: AppointmentRequestResponse) => {
    const fromStructured = requestedSlotToDatetimeLocal(
      request.requestedSlotStart,
    );
    const defaultStart =
      fromStructured ??
      toDateTimeLocal(request.preferredDate, request.preferredTime);
    const doctorId =
      doctorByRequest[request.id] ??
      request.preferredDoctorId ??
      doctorOptions[0]?.id;
    if (!doctorId) {
      showUserFacingErrorToast(
        null,
        "Select a doctor before approving this request.",
        "form",
      );
      return;
    }

    let resolvedDefaultStart = defaultStart;
    if (!startByRequest[request.id] && !fromStructured) {
      const fromSlots = await fetchFirstAvailableDatetimeLocal(
        request.preferredDate,
        doctorId,
      );
      if (fromSlots) {
        resolvedDefaultStart = fromSlots;
      }
    }

    const requestedEndLocal = requestedSlotToDatetimeLocal(
      request.requestedSlotEnd,
    );
    const startTime = startByRequest[request.id] ?? resolvedDefaultStart;
    const endTime =
      endByRequest[request.id] ??
      (requestedEndLocal && fromStructured
        ? requestedEndLocal
        : addMinutesLocal(startTime, 30));

    try {
      await approveRequest.mutateAsync({
        id: request.id,
        doctorId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        type: "Consultation",
        notes: request.notes ?? request.reason,
      });
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not approve this appointment request. Please try again.",
        "form",
      );
    }
  };

  const handleReject = async (request: AppointmentRequestResponse) => {
    const responseMessage = responseByRequest[request.id]?.trim();
    if (!responseMessage) {
      showUserFacingErrorToast(
        null,
        "Enter a response before rejecting this request.",
        "form",
      );
      return;
    }

    try {
      await rejectRequest.mutateAsync({
        id: request.id,
        responseMessage,
      });
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not reject this appointment request. Please try again.",
        "form",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Patient Requests</CardTitle>
          <Badge variant="secondary">{data?.count ?? 0} pending</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <DataState
          status={state}
          loadingMessage="Loading appointment requests…"
          errorMessage="We could not load appointment requests."
          onRetry={() => void refetch()}
          emptyIcon={Inbox}
          emptyTitle="No pending requests"
          emptyDescription="Patient portal appointment requests will appear here"
        >
          <div className="space-y-3">
            {requests.map((request) => {
              const defaultStart = toDateTimeLocal(
                request.preferredDate,
                request.preferredTime,
              );
              const startValue = startByRequest[request.id] ?? defaultStart;
              const endValue =
                endByRequest[request.id] ?? addMinutesLocal(startValue, 30);

              return (
                <div key={request.id} className="rounded-md border p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{patientName(request)}</div>
                      <p className="text-sm text-muted-foreground">
                        {request.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Preferred{" "}
                        {formatDate(request.preferredDate)}
                        {request.preferredTime
                          ? ` at ${request.preferredTime}`
                          : ""}
                      </p>
                    </div>
                    <Badge variant="outline">{request.status}</Badge>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-4">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={
                        doctorByRequest[request.id] ??
                        request.preferredDoctorId ??
                        doctorOptions[0]?.id ??
                        ""
                      }
                      onChange={(event) =>
                        setDoctorByRequest((prev) => ({
                          ...prev,
                          [request.id]: event.target.value,
                        }))
                      }
                      aria-label="Doctor"
                    >
                      {doctorOptions.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="datetime-local"
                      value={startValue}
                      onChange={(event) =>
                        setStartByRequest((prev) => ({
                          ...prev,
                          [request.id]: event.target.value,
                        }))
                      }
                      aria-label="Start time"
                    />
                    <Input
                      type="datetime-local"
                      value={endValue}
                      onChange={(event) =>
                        setEndByRequest((prev) => ({
                          ...prev,
                          [request.id]: event.target.value,
                        }))
                      }
                      aria-label="End time"
                    />
                    <Button
                      disabled={isMutating}
                      onClick={() => void handleApprove(request)}
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                  </div>

                  <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                    <Textarea
                      value={responseByRequest[request.id] ?? ""}
                      onChange={(event) =>
                        setResponseByRequest((prev) => ({
                          ...prev,
                          [request.id]: event.target.value,
                        }))
                      }
                      placeholder="Rejection message"
                      aria-label="Reject response"
                    />
                    <Button
                      variant="outline"
                      disabled={isMutating}
                      onClick={() => void handleReject(request)}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DataState>
      </CardContent>
    </Card>
  );
}
