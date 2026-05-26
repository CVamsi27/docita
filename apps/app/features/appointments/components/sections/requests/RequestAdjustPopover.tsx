"use client";

import { AlertCircle, SlidersHorizontal } from "lucide-react";
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
import { formatClinicPickerDayIsoFromSelection, formatScheduleTime } from "@workspace/utils";
import type { ApproveScheduleFieldKey } from "@/lib/utils/appointment-request-approve-errors";
import { cn } from "@workspace/ui/lib/utils";
import { type SchedulableDoctor, parsePickerIsoToLocalDate } from "./request-row-helpers";

type AvailableTime = { time: string; endTime: string };

export interface RequestAdjustPopoverProps {
  requestId: string;
  doctorOptions: SchedulableDoctor[];
  effectiveDoctorId: string;
  selectedDoctorName: string | null;
  slotLabel: string;
  slotDayLabel: string;
  startDayIso: string;
  startTimeHHmm: string;
  endHHmm: string;
  availableStartTimes: AvailableTime[];
  isStartAllowed: boolean;
  hasApproveFieldErrors: boolean;
  approveFieldErrors: Partial<Record<ApproveScheduleFieldKey, string>> | undefined;
  clinicTimezone: string;
  onClearApproveFieldErrors: () => void;
  setDoctorByRequest: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setStartByRequest: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function RequestAdjustPopover({
  requestId,
  doctorOptions,
  effectiveDoctorId,
  selectedDoctorName,
  slotLabel,
  slotDayLabel,
  startDayIso,
  startTimeHHmm,
  endHHmm,
  availableStartTimes,
  isStartAllowed,
  hasApproveFieldErrors,
  approveFieldErrors,
  clinicTimezone,
  onClearApproveFieldErrors,
  setDoctorByRequest,
  setStartByRequest,
}: RequestAdjustPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Adjust slot"
          className={cn(
            "h-8 gap-1.5 px-2 text-[length:var(--fs-xs)] font-normal text-muted-foreground hover:text-foreground",
            (hasApproveFieldErrors || !isStartAllowed) &&
              "text-destructive hover:text-destructive",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden tabular-nums sm:inline">{slotLabel}</span>
          {!isStartAllowed || hasApproveFieldErrors ? (
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 space-y-2.5 p-3"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
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

        <div className="grid grid-cols-2 gap-2">
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
                    const nextIso = formatClinicPickerDayIsoFromSelection(d, clinicTimezone);
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
                  approveFieldErrors?.startTime || !isStartAllowed
                    ? true
                    : undefined
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
        </div>

        <p className="text-[length:var(--fs-2xs)] text-muted-foreground">
          Ends {formatScheduleTime(endHHmm)}
          {selectedDoctorName ? ` · Dr. ${selectedDoctorName}` : ""}
        </p>
      </PopoverContent>
    </Popover>
  );
}
