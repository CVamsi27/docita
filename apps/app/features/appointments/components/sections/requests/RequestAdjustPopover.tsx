"use client";

import { AlertCircle, SlidersHorizontal } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/overlay/popover";
import { formatScheduleTime } from "@workspace/utils";
import type { ApproveScheduleFieldKey } from "@/lib/utils/appointment-request-approve-errors";
import { cn } from "@workspace/ui/lib/utils";
import type { SchedulableDoctor } from "./request-row-helpers";
import {
  RequestAdjustDateField,
  RequestAdjustDoctorField,
  RequestAdjustTimeField,
  type AvailableTime,
} from "./RequestAdjustPopoverFields";

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
  approveFieldErrors:
    | Partial<Record<ApproveScheduleFieldKey, string>>
    | undefined;
  clinicTimezone: string;
  onClearApproveFieldErrors: () => void;
  setDoctorByRequest: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setStartByRequest: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
}

/**
 * Popover that lets staff override an appointment request's suggested
 * doctor/date/time before approving it. The form fields themselves live in
 * `RequestAdjustPopoverFields` (doctor select, date picker, time select) —
 * this component owns only the trigger button, popover shell, and the
 * summary footer line.
 */
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
        className="w-[min(100vw-2rem,18rem)] space-y-2.5 p-3"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <RequestAdjustDoctorField
          requestId={requestId}
          doctorOptions={doctorOptions}
          effectiveDoctorId={effectiveDoctorId}
          approveFieldErrors={approveFieldErrors}
          onClearApproveFieldErrors={onClearApproveFieldErrors}
          setDoctorByRequest={setDoctorByRequest}
          setStartByRequest={setStartByRequest}
        />

        <div className="grid grid-cols-2 gap-2">
          <RequestAdjustDateField
            requestId={requestId}
            slotDayLabel={slotDayLabel}
            startDayIso={startDayIso}
            startTimeHHmm={startTimeHHmm}
            clinicTimezone={clinicTimezone}
            onClearApproveFieldErrors={onClearApproveFieldErrors}
            setStartByRequest={setStartByRequest}
          />

          <RequestAdjustTimeField
            requestId={requestId}
            startDayIso={startDayIso}
            startTimeHHmm={startTimeHHmm}
            availableStartTimes={availableStartTimes}
            isStartAllowed={isStartAllowed}
            approveFieldErrors={approveFieldErrors}
            onClearApproveFieldErrors={onClearApproveFieldErrors}
            setStartByRequest={setStartByRequest}
          />
        </div>

        <p className="text-[length:var(--fs-2xs)] text-muted-foreground">
          Ends {formatScheduleTime(endHHmm)}
          {selectedDoctorName ? ` · Dr. ${selectedDoctorName}` : ""}
        </p>
      </PopoverContent>
    </Popover>
  );
}
