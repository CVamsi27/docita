// check-non-null-assertion: allow-file — non-null guaranteed by prior guard or Prisma include
"use client";

import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Label } from "@workspace/ui/components/form/label";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Input } from "@workspace/ui/components/form/input";
import { Switch } from "@workspace/ui/components/form/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Trash2 } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { IsoDatePickerField } from "@workspace/ui/components/form/iso-date-picker-field";
import { formatDate } from "@workspace/utils";
import type { DoctorTimeOff } from "@workspace/data-access";

// ---------------------------------------------------------------------------
// DoctorSelectorSection
// ---------------------------------------------------------------------------

interface DoctorSelectorSectionProps {
  doctors: Array<{ id: string; name: string }>;
  selectedDoctorId: string;
  onDoctorChange: (id: string) => void;
}

export function DoctorSelectorSection({
  doctors,
  selectedDoctorId,
  onDoctorChange,
}: DoctorSelectorSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="time-away-doctor">Doctor</Label>
      <Select value={selectedDoctorId} onValueChange={onDoctorChange}>
        <SelectTrigger id="time-away-doctor" className="w-full sm:w-72">
          <SelectValue placeholder="Doctor" />
        </SelectTrigger>
        <SelectContent>
          {doctors.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface TimeAwayFormFieldsProps {
  startDate: string; onStartDateChange: (date: string) => void;
  endDate: string; onEndDateChange: (date: string) => void;
  reason: string; onReasonChange: (reason: string) => void;
  isFullDay: boolean; onIsFullDayChange: (fullDay: boolean) => void;
  partialStart: string; onPartialStartChange: (time: string) => void;
  partialEnd: string; onPartialEndChange: (time: string) => void;
}

export function TimeAwayFormFields({ startDate, onStartDateChange, endDate, onEndDateChange, reason, onReasonChange, isFullDay, onIsFullDayChange, partialStart, onPartialStartChange, partialEnd, onPartialEndChange }: TimeAwayFormFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <IsoDatePickerField id="time-away-start" label="Start date" value={startDate} onChange={onStartDateChange} />
        <IsoDatePickerField id="time-away-end" label="End date" value={endDate} onChange={onEndDateChange} />
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="time-away-reason">Reason (optional)</Label>
          <Input id="time-away-reason" value={reason} onChange={(e) => onReasonChange(e.target.value)} placeholder="Reason" maxLength={200} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
        <Switch id="time-away-full-day" checked={isFullDay} onCheckedChange={onIsFullDayChange} />
        <Label htmlFor="time-away-full-day" className="cursor-pointer">Full day each day</Label>
      </div>
      {!isFullDay ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="time-away-partial-start">Away from</Label>
            <Input id="time-away-partial-start" type="time" value={partialStart} onChange={(e) => onPartialStartChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time-away-partial-end">Away until</Label>
            <Input id="time-away-partial-end" type="time" value={partialEnd} onChange={(e) => onPartialEndChange(e.target.value)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

interface ScheduledTimeAwayListProps {
  timeOffs: DoctorTimeOff[]; isLoading: boolean; currentUserId?: string;
  userRole: string | undefined; isAdminCheck: (role: string | undefined) => boolean;
  onDelete: (id: string) => Promise<void>; isDeleting: boolean;
}
export function ScheduledTimeAwayList({ timeOffs, isLoading, currentUserId, userRole, isAdminCheck, onDelete, isDeleting }: ScheduledTimeAwayListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Scheduled time away</h3>
      {isLoading ? <Skeleton className="h-24 w-full" />
      : timeOffs.length === 0 ? <p className="text-sm text-muted-foreground">No time away recorded yet.</p>
      : (
        <ul className="divide-y divide-border rounded-md border">
          {timeOffs.map((off) => {
            const start = new Date(off.startDate), end = new Date(off.endDate);
            return (
              <li key={off.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-3 text-sm">
                <div>
                  <div className="font-medium">
                    {formatDate(start, "MMM d, yyyy")}{" – "}{formatDate(end, "MMM d, yyyy")}
                    {!off.isFullDay && off.startTime && off.endTime ? ` (${off.startTime}–${off.endTime})` : null}
                  </div>
                  {off.reason ? <div className="text-muted-foreground">{off.reason}</div> : null}
                </div>
                {off.id && (isAdminCheck(userRole) || off.doctorId === currentUserId) ? (
                  <SymbolTooltip label="Remove time away">
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" aria-label="Remove time away" disabled={isDeleting} onClick={() => void onDelete(off.id!)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </SymbolTooltip>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
// ---------------------------------------------------------------------------
// TimeAwayCardHeader
// ---------------------------------------------------------------------------

export function TimeAwayHeader() {
  return (
    <CardHeader className="border-b border-border/60 pb-5">
      <CardTitle>Time away</CardTitle>
      <CardDescription>
        Block your calendar for holidays or other full-day absences. Separate
        from leave requests under the Leave tab.
      </CardDescription>
    </CardHeader>
  );
}
