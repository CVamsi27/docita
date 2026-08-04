"use client";

import { Calendar as CalendarIcon, ChevronDown, Clock, UserCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Button, Collapsible, CollapsibleContent, CollapsibleTrigger, EmptyState } from "@workspace/ui/components";
import { SlotTimesScrollArea, SlotTimesSkeletonGrid } from "@/features/public-booking/public-booking-components";
import { publicBookingSlotEmptyMessage } from "@/features/public-booking/atoms/booking-constants";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { formatTime } from "@/lib/formatters";
import { SlotGridAvailableSlotList } from "./slot-grid-available-slot-list";
import { SlotGridTimeRangeFilters } from "./slot-grid-time-range-filters";

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
        <Collapsible className="group mb-3 rounded-[var(--radius-md)] border border-border/50 bg-surface-2 data-[state=open]:border-border/70 data-[state=open]:shadow-sm">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-between gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-[length:var(--fs-sm)] font-medium text-foreground transition-colors duration-150 hover:bg-muted/15"
            >
              <span>Filter by time of day</span>
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180"
                aria-hidden
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-border/40 px-3 pb-3 pt-2">
            <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
              <SlotGridTimeRangeFilters c={c} useNoneValue />
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="mb-3 grid gap-3 rounded-[var(--radius-md)] border border-border/50 bg-surface-2 p-3 shadow-sm sm:grid-cols-2 sm:items-end sm:p-4">
          <SlotGridTimeRangeFilters c={c} useNoneValue={false} />
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
        <SlotGridAvailableSlotList c={c} />
      )}
    </SlotTimesScrollArea>
  );
}
