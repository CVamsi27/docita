"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { ANY_DOCTOR_ID } from "@/features/public-booking/public-booking-constants";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { formatTime } from "@/lib/formatters";
import { cn } from "@workspace/ui/lib/utils";

export function SlotGridAvailableSlotList({
  c,
}: {
  c: PublicBookingPageController;
}) {
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
