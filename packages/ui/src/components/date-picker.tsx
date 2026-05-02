"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { formatDate } from "@workspace/utils";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";

interface DatePickerProps extends Omit<
  React.ComponentProps<typeof Button>,
  "children" | "onClick" | "onChange" | "type" | "value"
> {
  value?: Date | string;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  maxDate?: Date;
  minDate?: Date;
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = "Pick a date",
      disabled = false,
      maxDate,
      minDate,
      className,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const dateValue = React.useMemo(() => {
      if (!value) return undefined;
      if (value instanceof Date) return value;

      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }, [value]);

    const handleSelect = (date: Date | undefined) => {
      onChange?.(date);
      setOpen(false);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal aria-invalid:border-destructive aria-invalid:bg-destructive/5 aria-invalid:ring-destructive/20",
              !dateValue && "text-muted-foreground",
              className,
            )}
            {...props}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue ? (
              formatDate(dateValue, "dd MMMM yyyy")
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleSelect}
            disabled={(date) => {
              if (maxDate && date > maxDate) return true;
              if (minDate && date < minDate) return true;
              return false;
            }}
            defaultMonth={dateValue}
            captionLayout="dropdown"
            fromYear={1900}
            toYear={new Date().getFullYear()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  },
);

DatePicker.displayName = "DatePicker";

export { DatePicker };
