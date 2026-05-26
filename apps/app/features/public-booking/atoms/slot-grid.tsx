"use client";

import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  Clock,
  UserCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  ANY_DOCTOR_ID,
} from "@/features/public-booking/public-booking-constants";
import {
  publicBookingSlotEmptyMessage,
  SlotTimesScrollArea,
  SlotTimesSkeletonGrid,
} from "@/features/public-booking/public-booking-components";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { formatTime } from "@/lib/formatters";
import { cn } from "@workspace/ui/lib/utils";

function TimeRangeFilters({
  c,
  useNoneValue,
}: {
  c: PublicBookingPageController;
  useNoneValue: boolean;
}) {
  const noneVal = useNoneValue ? "__none__" : "";

  return (
    <>
      <div className="grid gap-2">
        <Label className="text-[length:var(--fs-xs)] font-normal text-muted-foreground">
          Time range (from)
        </Label>
        <Select
          value={useNoneValue ? (c.timeRangeStart || noneVal) : c.timeRangeStart}
          onValueChange={(v) => {
            const val = useNoneValue && v === "__none__" ? "" : v;
            c.setTimeRangeStart(val);
            if (c.timeRangeEnd) {
              const s = new Date(val).getTime();
              const e = new Date(c.timeRangeEnd).getTime();
              if (Number.isFinite(s) && Number.isFinite(e) && e <= s) {
                c.setTimeRangeEnd("");
              }
            }
          }}
        >
          <SelectTrigger className="h-11 rounded-[var(--radius-md)] border-border/70 bg-background shadow-sm">
            <SelectValue placeholder="Any time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={noneVal}>Any time</SelectItem>
            {c.timeRangeOptions.starts.map((t) => (
              <SelectItem key={t} value={t}>
                {formatTime(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label className="text-[length:var(--fs-xs)] font-normal text-muted-foreground">
          Time range (to)
        </Label>
        <Select
          value={useNoneValue ? (c.timeRangeEnd || noneVal) : c.timeRangeEnd}
          onValueChange={(v) =>
            c.setTimeRangeEnd(useNoneValue && v === "__none__" ? "" : v)
          }
        >
          <SelectTrigger className="h-11 rounded-[var(--radius-md)] border-border/70 bg-background shadow-sm">
            <SelectValue placeholder="Any time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={noneVal}>Any time</SelectItem>
            {c.timeRangeOptions.ends.map((t) => (
              <SelectItem key={t} value={t}>
                {formatTime(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function AvailableSlotList({ c }: { c: PublicBookingPageController }) {
  return (
    <ul className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
      {c.filteredAvailableSlots.map((s) => {
        const selected =
          c.selectedStart === s.startTime &&
          (c.doctorId !== ANY_DOCTOR_ID ||
            c.selectedSlotDoctorId === s.doctorId);
        return (
          <li
            key={`${s.startTime}-${s.endTime}-${s.doctorId}`}
            className="min-w-0"
          >
            <Button
              type="button"
              variant={selected ? "default" : "outline"}
              className={cn(
                "h-auto min-h-[3.25rem] max-md:min-h-[3.5rem] w-full min-w-0 justify-start rounded-[var(--radius-md)] px-4 py-3 text-left outline-none ring-offset-background transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
                selected
                  ? "shadow-md ring-2 ring-primary/45 ring-offset-2 ring-offset-background border border-primary/40"
                  : "touch-manipulation border-border/70 shadow-sm hover:border-primary/35 hover:bg-muted/25 hover:shadow-md",
              )}
              onClick={() =>
                c.doctorId === ANY_DOCTOR_ID
                  ? c.handleSelectSlotWithDoctor(s.startTime, s.endTime, s.doctorId)
                  : c.handleSelectSlot(s.startTime, s.endTime)
              }
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
                <span
                  className={cn(
                    "text-[length:var(--fs-sm)] font-medium tracking-tight",
                    selected && "text-primary-foreground",
                  )}
                >
                  {formatTime(s.startTime)}{" "}
                  <span
                    aria-hidden
                    className={cn(
                      "font-normal",
                      selected
                        ? "text-primary-foreground/85"
                        : "text-muted-foreground/90",
                    )}
                  >
                    -
                  </span>{" "}
                  {formatTime(s.endTime)}
                </span>
                {s.doctorName ? (
                  <span
                    className={cn(
                      "truncate text-[length:var(--fs-xs)]",
                      selected
                        ? "text-primary-foreground/90"
                        : "text-muted-foreground",
                    )}
                  >
                    {s.doctorName}
                    {s.specialization ? ` - ${s.specialization}` : ""}
                  </span>
                ) : null}
              </span>
              {selected ? (
                <CheckCircle2
                  className="ml-3 h-[1.125rem] w-[1.125rem] shrink-0 text-primary-foreground"
                  aria-hidden
                />
              ) : null}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

export function SlotGrid({
  c,
  doctorPickerVariant,
  collapseTimeRange,
}: {
  c: PublicBookingPageController;
  doctorPickerVariant: "chips" | "toggle";
  collapseTimeRange: boolean;
}) {
  if (!c.doctorId) {
    return (
      <EmptyState
        icon={UserCircle}
        title={
          doctorPickerVariant === "chips"
            ? "Select a doctor above"
            : "Doctor selection is optional"
        }
        description={
          doctorPickerVariant === "chips"
            ? "Tap a doctor to see open times for the day you picked, or tap 'Any doctor' to see all available slots."
            : "If you choose a doctor, you can pick an exact time. Otherwise, you can request a date only and the clinic will assign a doctor and time."
        }
        className="flex flex-1 flex-col justify-center rounded-[var(--radius-md)] border border-dashed border-border/60 bg-muted/10 px-3 py-6 shadow-sm sm:py-8 xl:min-h-0 [&_.ui-section-title]:text-[length:var(--fs-base)]"
      />
    );
  }

  if (c.slotsQuery.isLoading) return <SlotTimesSkeletonGrid />;

  if (c.slotsQuery.isError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 xl:justify-center">
        <Alert
          variant="destructive"
          className="rounded-[var(--radius-md)] text-left [&>svg]:top-3.5"
        >
          <Clock className="h-4 w-4 shrink-0" aria-hidden />
          <AlertTitle>Open times unavailable</AlertTitle>
          <AlertDescription>
            Open times could not be loaded. Check your connection and try again.
          </AlertDescription>
        </Alert>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => void c.slotsQuery.refetch()}
        >
          Retry loading times
        </Button>
      </div>
    );
  }

  if (c.allSlots.length === 0) {
    return (
      <EmptyState
        icon={CalendarIcon}
        title="No times this day"
        description={publicBookingSlotEmptyMessage(
          c.slotsQuery.data?.slotListEmptyReason,
        )}
        className="flex flex-1 flex-col justify-center rounded-[var(--radius-md)] border border-dashed border-border/60 bg-muted/10 px-3 py-6 shadow-sm sm:py-8 xl:min-h-0 [&_.ui-section-title]:text-[length:var(--fs-base)]"
      />
    );
  }

  if (c.availableSlots.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <EmptyState
          icon={Clock}
          title="No openings left"
          description="There are no free times left on this date. The times below are already booked, blocked, or earlier in the day. Choose another date if you need an opening."
          className="shrink-0 rounded-[var(--radius-md)] border border-dashed border-border/60 bg-muted/10 px-3 py-5 shadow-sm sm:py-6 [&_.ui-section-title]:text-[length:var(--fs-base)]"
        />
        <SlotTimesScrollArea enabled={c.allSlots.length > 6}>
          <ul className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            {c.allSlots.map((s) => (
              <li
                key={`${s.startTime}-${s.endTime}-${s.doctorId}`}
                className="min-w-0"
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="h-auto min-h-[3.25rem] w-full min-w-0 cursor-not-allowed justify-start rounded-[var(--radius-md)] border-border/70 bg-muted/25 px-4 py-3 text-left opacity-80 shadow-sm"
                  aria-label={`${formatTime(s.startTime)} to ${formatTime(s.endTime)}, unavailable`}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
                    <span className="text-[length:var(--fs-sm)] font-medium tracking-tight text-muted-foreground">
                      {formatTime(s.startTime)}{" "}
                      <span
                        aria-hidden
                        className="font-normal text-muted-foreground/80"
                      >
                        -
                      </span>{" "}
                      {formatTime(s.endTime)}
                    </span>
                    <span className="truncate text-[length:var(--fs-xs)] text-muted-foreground">
                      Unavailable
                      {s.doctorName ? ` — ${s.doctorName}` : ""}
                    </span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </SlotTimesScrollArea>
      </div>
    );
  }

  return (
    <SlotTimesScrollArea enabled={c.filteredAvailableSlots.length > 6}>
      {collapseTimeRange ? (
        <details className="mb-3 rounded-[var(--radius-md)] border border-border/50 bg-surface-2 open:border-border/70 open:shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[length:var(--fs-sm)] font-medium text-foreground transition-colors duration-150 hover:bg-muted/15 [&::-webkit-details-marker]:hidden">
            <span>Filter by time of day</span>
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-150"
              aria-hidden
            />
          </summary>
          <div className="border-t border-border/40 px-3 pb-3 pt-2">
            <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
              <TimeRangeFilters c={c} useNoneValue />
            </div>
          </div>
        </details>
      ) : (
        <div className="mb-3 grid gap-3 rounded-[var(--radius-md)] border border-border/50 bg-surface-2 p-3 shadow-sm sm:grid-cols-2 sm:items-end sm:p-4">
          <TimeRangeFilters c={c} useNoneValue={false} />
        </div>
      )}
      {c.filteredAvailableSlots.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No openings in this time range"
          description="Try a wider window or clear the time range to see all openings for this day."
          className="flex flex-1 flex-col justify-center rounded-[var(--radius-md)] border border-dashed border-border/60 bg-muted/10 px-3 py-6 shadow-sm sm:py-8 xl:min-h-0 [&_.ui-section-title]:text-[length:var(--fs-base)]"
        />
      ) : (
        <AvailableSlotList c={c} />
      )}
    </SlotTimesScrollArea>
  );
}
