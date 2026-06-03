"use client";

import { Search, X } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import { SymbolTooltip } from "../overlay/tooltip";

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  placeholder: string;
  ariaLabel: string;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder,
  ariaLabel,
}: SearchInputProps) {
  const isEmpty = !value.trim();
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        placeholder={placeholder}
        className={`bg-background pl-10${isEmpty ? "" : " pr-10"}`}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
      />
      {!isEmpty && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <SymbolTooltip label="Clear search">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClear}
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground" aria-hidden />
            </Button>
          </SymbolTooltip>
        </div>
      )}
    </div>
  );
}
