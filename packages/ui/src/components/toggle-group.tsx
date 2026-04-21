"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@workspace/ui/lib/utils";

type ToggleGroupType = "single" | "multiple";

const toggleGroupVariants = cva("inline-flex gap-2", {
  variants: {
    variant: {
      default: "",
      outline: "",
    },
    size: {
      default: "",
      sm: "",
      lg: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

interface ToggleGroupContextValue {
  type: ToggleGroupType;
  value: string | string[] | undefined;
  onValueChange: (value: string) => void;
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(
  null,
);

export interface ToggleGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toggleGroupVariants> {
  type?: ToggleGroupType;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
}

export function ToggleGroup({
  className,
  variant,
  size,
  type = "single",
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: ToggleGroupProps) {
  const [internalValue, setInternalValue] = React.useState<
    string | string[] | undefined
  >(defaultValue);

  const currentValue = value ?? internalValue;

  const handleValueChange = (nextValue: string) => {
    if (type === "multiple") {
      const current = Array.isArray(currentValue) ? currentValue : [];
      const next = current.includes(nextValue)
        ? current.filter((item) => item !== nextValue)
        : [...current, nextValue];
      onValueChange?.(next);
      if (value === undefined) setInternalValue(next);
      return;
    }

    onValueChange?.(nextValue);
    if (value === undefined) setInternalValue(nextValue);
  };

  return (
    <ToggleGroupContext.Provider
      value={{ type, value: currentValue, onValueChange: handleValueChange }}
    >
      <div
        data-slot="toggle-group"
        className={cn(toggleGroupVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

export interface ToggleGroupItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function ToggleGroupItem({
  className,
  value,
  onClick,
  children,
  ...props
}: ToggleGroupItemProps) {
  const context = React.useContext(ToggleGroupContext);
  const pressed = Array.isArray(context?.value)
    ? context.value.includes(value)
    : context?.value === value;

  return (
    <button
      type="button"
      data-slot="toggle-group-item"
      aria-pressed={pressed}
      onClick={(event) => {
        onClick?.(event);
        context?.onValueChange(value);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
