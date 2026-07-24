"use client";

import { Input, SymbolTooltip } from "@workspace/ui/components";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

export interface TagSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

/** Search box for the tag manager dialog: filters current tags and presets, with a clear button once non-empty. */
export function TagSearchField({ value, onChange, onClear }: TagSearchFieldProps) {
  const t = useTranslations("Patients.tagManager");
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        placeholder={t("searchPlaceholder")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={value.trim() ? "pl-9 pr-10" : "pl-9"}
        aria-label={t("searchAria")}
      />
      {value && (
        <SymbolTooltip label={t("clearSearchAria")}>
          <button
            type="button"
            aria-label={t("clearSearchAria")}
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </SymbolTooltip>
      )}
    </div>
  );
}
