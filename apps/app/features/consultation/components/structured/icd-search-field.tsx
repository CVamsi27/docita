"use client";

import { useState } from "react";
import { Button, Input, SymbolTooltip } from "@workspace/ui/components";
import { Search, X } from "lucide-react";
import { useSearchIcdCodes } from "@workspace/data-access";
import { useDebounce } from "@workspace/hooks/use-debounce";
import type { DiagnosisItem } from "./diagnosis-input-types";

export function IcdSearchField({
  value,
  onSelect,
  onClear,
  readOnly,
}: {
  value?: DiagnosisItem["icdCode"];
  onSelect: (code: { id: string; code: string; description: string }) => void;
  onClear: () => void;
  readOnly?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const { data: results = [] } = useSearchIcdCodes(
    debouncedSearch.length >= 2 ? debouncedSearch : "",
  );

  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30 text-sm">
        <span className="font-mono font-semibold text-primary">
          {value.code}
        </span>
        <span className="text-muted-foreground truncate flex-1">
          {value.description}
        </span>
        {!readOnly ? (
          <SymbolTooltip label="Clear ICD-10 code">
            <button
              type="button"
              onClick={onClear}
              className="text-muted-foreground hover:text-destructive shrink-0"
              aria-label="Clear ICD-10 code"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </SymbolTooltip>
        ) : null}
      </div>
    );
  }

  if (readOnly) return (
      <div className="px-3 py-2 rounded-md border bg-muted/10 text-sm text-muted-foreground">
        No ICD-10 code
      </div>
    );

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          placeholder="ICD-10 code"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={`h-9 bg-background pl-8 text-sm${search.trim() ? " pr-9" : ""}`}
          aria-label="Search ICD-10 codes"
        />
        {search.trim() ? (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <SymbolTooltip label="Clear search">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => {
                  setSearch("");
                  setOpen(false);
                }}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </Button>
            </SymbolTooltip>
          </div>
        ) : null}
      </div>
      {open && results.length > 0 ? (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="max-h-48 overflow-y-auto py-1">
            {results.map((icd) => (
              <li key={icd.id}>
                <button
                  type="button"
                  onMouseDown={() => {
                    onSelect({
                      id: icd.id,
                      code: icd.code,
                      description: icd.description,
                    });
                    setSearch("");
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                >
                  <span className="font-mono font-semibold text-primary shrink-0">
                    {icd.code}
                  </span>
                  <span className="text-muted-foreground truncate">
                    {icd.description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
