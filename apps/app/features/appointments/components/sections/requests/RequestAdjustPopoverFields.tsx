"use client";

import { Button } from "@workspace/ui/components/form/button";
import { Calendar } from "@workspace/ui/components/form/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/overlay/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  formatClinicPickerDayIsoFromSelection,
  formatScheduleTime,
} from "@workspace/utils";
import type { ApproveScheduleFieldKey } from "@/lib/utils/appointment-request-approve-errors";
import { cn } from "@workspace/ui/lib/utils";
import {
  type SchedulableDoctor,
  parsePickerIsoToLocalDate,
} from "./request-row-helpers";

export type AvailableTime = { time: string; endTime: string };

type ApproveFieldErrors = Partial<Record<ApproveScheduleFieldKey, string>> | undefined;

type SetByRequest = React.Dispatch<React.SetStateAction<Record<string, string>>>;

export interface RequestAdjustDoctorFieldProps {
  requestId: string;
  doctorOptions: SchedulableDoctor[];
  effectiveDoctorId: string;
  approveFieldErrors: ApproveFieldErrors;
  onClearApproveFieldErrors: () => void;
  setDoctorByRequest: SetByRequest;
  setStartByRequest: SetByRequest;
}

/** Doctor select for the slot-adjust popover; switching doctors also clears any pending start-time override. */
export function RequestAdjustDoctorField({
  requestId,
  doctorOptions,
  effectiveDoctorId,
  approveFieldErrors,
  onClearApproveFieldErrors,
  setDoctorByRequest,
  setStartByRequest,
}: RequestAdjustDoctorFieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={`apr-doctor-${requestId}`}
        className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground"
      >
        Doctor
      </label>
      <Select
        value={effectiveDoctorId}
        onValueChange={(value) => {
          onClearApproveFieldErrors();
          setDoctorByRequest((prev) => ({ ...prev, [requestId]: value }));
          setStartByRequest((prev) => {
            const next = { ...prev };
            delete next[requestId];
            return next;
          });
        }}
      >
        <SelectTrigger
          id={`apr-doctor-${requestId}`}
          size="sm"
          className={cn(
            "h-8 w-full text-[length:var(--fs-xs)]",
            approveFieldErrors?.doctorId && "border-destructive",
          )}
          aria-invalid={approveFieldErrors?.doctorId ? true : undefined}
        >
          <SelectValue placeholder="Doctor" />
        </SelectTrigger>
        <SelectContent>
          {doctorOptions.map((doctor) => (
            <SelectItem key={doctor.id} value={doctor.id}>
              {doctor.name ?? "Doctor"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export interface RequestAdjustDateFieldProps {
  requestId: string;
  slotDayLabel: string;
  startDayIso: string;
  startTimeHHmm: string;
  clinicTimezone: string;
  onClearApproveFieldErrors: () => void;
  setStartByRequest: SetByRequest;
}

/** Date picker for the slot-adjust popover; preserves the current start time when the day changes. */
export function RequestAdjustDateField({
  requestId,
  slotDayLabel,
  startDayIso,
  startTimeHHmm,
  clinicTimezone,
  onClearApproveFieldErrors,
  setStartByRequest,
}: RequestAdjustDateFieldProps) {
  return (
    <div className="space-y-1">
      <span className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground">
        Date
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full justify-start px-2 text-[length:var(--fs-xs)] font-normal"
          >
            {slotDayLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parsePickerIsoToLocalDate(startDayIso) ?? undefined}
            onSelect={(d) => {
              if (!d) return;
              onClearApproveFieldErrors();
              const nextIso = formatClinicPickerDayIsoFromSelection(
                d,
                clinicTimezone,
              );
              setStartByRequest((prev) => ({
                ...prev,
                [requestId]: `${nextIso}T${startTimeHHmm}`,
              }));
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export interface RequestAdjustTimeFieldProps {
  requestId: string;
  startDayIso: string;
  startTimeHHmm: string;
  availableStartTimes: AvailableTime[];
  isStartAllowed: boolean;
  approveFieldErrors: ApproveFieldErrors;
  onClearApproveFieldErrors: () => void;
  setStartByRequest: SetByRequest;
}

/** Start-time select for the slot-adjust popover; falls back to the current value when no slots are available. */
export function RequestAdjustTimeField({
  requestId,
  startDayIso,
  startTimeHHmm,
  availableStartTimes,
  isStartAllowed,
  approveFieldErrors,
  onClearApproveFieldErrors,
  setStartByRequest,
}: RequestAdjustTimeFieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={`apr-start-${requestId}`}
        className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground"
      >
        Time
      </label>
      <Select
        value={startTimeHHmm}
        onValueChange={(value) => {
          onClearApproveFieldErrors();
          setStartByRequest((prev) => ({
            ...prev,
            [requestId]: `${startDayIso}T${value}`,
          }));
        }}
      >
        <SelectTrigger
          id={`apr-start-${requestId}`}
          size="sm"
          className={cn(
            "h-8 w-full text-[length:var(--fs-xs)]",
            (approveFieldErrors?.startTime || !isStartAllowed) &&
              "border-destructive",
          )}
          aria-invalid={
            approveFieldErrors?.startTime || !isStartAllowed ? true : undefined
          }
        >
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent>
          {availableStartTimes.length > 0 ? (
            availableStartTimes.map((s) => (
              <SelectItem key={s.time} value={s.time}>
                {formatScheduleTime(s.time)}
              </SelectItem>
            ))
          ) : (
            <SelectItem value={startTimeHHmm}>
              {formatScheduleTime(startTimeHHmm)}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
