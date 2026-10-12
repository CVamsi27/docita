"use client";

import { Calendar as CalendarIcon, ChevronDown, Clock, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle, Button, Collapsible, CollapsibleContent, CollapsibleTrigger, EmptyState } from "@workspace/ui/components";
import { SlotTimesScrollArea, SlotTimesSkeletonGrid } from "@/features/public-booking/public-booking-components";
import { publicBookingSlotEmptyKey } from "@/features/public-booking/atoms/booking-constants";
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
  const { t } = useTranslation("PublicBooking");

  if (!c.doctorId) {
    return (
      <EmptyState
        icon={UserCircle}
        title={
          doctorPickerVariant === "chips"
            ? t("slotGrid.selectDoctorTitle")
            : t("slotGrid.doctorOptionalTitle")
        }
        description={
          doctorPickerVariant === "chips"
            ? t("slotGrid.selectDoctorDescription")
            : t("slotGrid.doctorOptionalDescription")
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
          <AlertTitle>{t("slotGrid.unavailableTitle")}</AlertTitle>
          <AlertDescription>
            {t("slotGrid.unavailableDescription")}
          </AlertDescription>
        </Alert>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => void c.slotsQuery.refetch()}
        >
          {t("slotGrid.retry")}
        </Button>
      </div>
    );
  }

  if (c.allSlots.length === 0) {
    return (
      <EmptyState
        icon={CalendarIcon}
        title={t("slotGrid.noTimesTitle")}
        description={t(
          publicBookingSlotEmptyKey(c.slotsQuery.data?.slotListEmptyReason),
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
          title={t("slotGrid.noOpeningsTitle")}
          description={t("slotGrid.noOpeningsDescription")}
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
                  aria-label={t("slotGrid.unavailableSlotAria", {
                    start: formatTime(s.startTime),
                    end: formatTime(s.endTime),
                    doctor: s.doctorName ? `, ${s.doctorName}` : "",
                  })}
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
                      {t("slotGrid.unavailableSuffix")}
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
              <span>{t("slotGrid.filterByTimeOfDay")}</span>
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
          title={t("slotGrid.noOpeningsInRangeTitle")}
          description={t("slotGrid.noOpeningsInRangeDescription")}
          className="flex flex-1 flex-col justify-center rounded-[var(--radius-md)] border border-dashed border-border/60 bg-muted/10 px-3 py-6 shadow-sm sm:py-8 xl:min-h-0 [&_.ui-section-title]:text-[length:var(--fs-base)]"
        />
      ) : (
        <SlotGridAvailableSlotList c={c} />
      )}
    </SlotTimesScrollArea>
  );
}
