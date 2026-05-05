"use client";

import { useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { formatDate, formatPickerIsoDate } from "@workspace/utils";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";

/** Parse `yyyy-MM-dd` into a local-calendar `Date` at midnight. */
export function parseIsoDateToLocalDate(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return undefined;
  }
  return new Date(y, mo - 1, d);
}

function startOfLocalDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export interface IsoDatePickerFieldProps {
  id: string;
  /** When `showLabel` is false, use an external label (for example `FormLabel`) with matching `htmlFor={id}`. */
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Defaults to true. Set false when a parent `FormLabel` or table filter label supplies the visible label. */
  showLabel?: boolean;
  labelClassName?: string;
  triggerClassName?: string;
  required?: boolean;
  /** Disable calendar days before today (local midnight). */
  disablePastDates?: boolean;
}

export function IsoDatePickerField({
  id,
  label,
  value,
  onChange,
  className,
  disabled,
  placeholder = "Select date",
  showLabel = true,
  labelClassName,
  triggerClassName,
  required,
  disablePastDates,
}: IsoDatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => parseIsoDateToLocalDate(value) ?? new Date());

  useEffect(() => {
    const parsed = parseIsoDateToLocalDate(value);
    if (parsed) {
      setMonth(parsed);
    }
  }, [value]);

  const selected = value ? parseIsoDateToLocalDate(value) : undefined;
  const currentYear = new Date().getFullYear();

  return (
    <div className={cn(showLabel ? "space-y-2" : undefined, className)}>
      {showLabel && label ? (
        <Label htmlFor={id} className={labelClassName}>
          {label}
        </Label>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-required={required ? true : undefined}
            className={cn(
              "h-10 w-full justify-start font-normal sm:w-72",
              !selected && "text-muted-foreground",
              triggerClassName,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" aria-hidden />
            {selected ? formatDate(selected, "dd MMM yyyy") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            fromYear={1900}
            toYear={currentYear + 10}
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            initialFocus
            disabled={
              disablePastDates
                ? (day) => startOfLocalDay(day) < startOfLocalDay(new Date())
                : undefined
            }
            onSelect={(d) => {
              if (d) {
                onChange(formatPickerIsoDate(d));
                setMonth(d);
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
