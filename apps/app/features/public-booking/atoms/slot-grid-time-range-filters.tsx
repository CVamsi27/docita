"use client";

// jscpd:ignore-start
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui/components";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { formatTime } from "@/lib/formatters";

export function SlotGridTimeRangeFilters({
// jscpd:ignore-end
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
          value={useNoneValue ? c.timeRangeStart || noneVal : c.timeRangeStart}
          onValueChange={(v) => {
            const val = useNoneValue && v === "__none__" ? "" : v;
            c.setTimeRangeStart(val);
            if (c.timeRangeEnd) {
              const s = new Date(val).getTime();
              const e = new Date(c.timeRangeEnd).getTime();
              if (Number.isFinite(s) && Number.isFinite(e) && e <= s)
                c.setTimeRangeEnd("");
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
          value={useNoneValue ? c.timeRangeEnd || noneVal : c.timeRangeEnd}
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
