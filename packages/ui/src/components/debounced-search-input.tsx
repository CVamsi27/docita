"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useDebounce } from "@workspace/hooks";

import { Input } from "./input";
import { cn } from "../lib/utils";

interface DebouncedSearchInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange"
> {
  value: string;
  onChange: (value: string) => void;
  delay?: number;
}

export function DebouncedSearchInput({
  value,
  onChange,
  delay = 300,
  className,
  ...props
}: DebouncedSearchInputProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const debouncedValue = useDebounce(localValue, delay);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  React.useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  return (
    <div className="relative w-full">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        className={cn("pl-8", className)}
        {...props}
      />
    </div>
  );
}
