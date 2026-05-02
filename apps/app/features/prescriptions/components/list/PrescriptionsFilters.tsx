import React from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { Search, X } from "lucide-react";

interface PrescriptionsFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function PrescriptionsFilters({
  searchQuery,
  setSearchQuery,
}: PrescriptionsFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
        <Input
          placeholder="Enter patient, diagnosis, or phone"
          className={`bg-background pl-9${searchQuery.trim() ? " pr-10" : ""}`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search prescriptions"
        />
        {searchQuery.trim() ? (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <SymbolTooltip label="Clear search">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" aria-hidden />
              </Button>
            </SymbolTooltip>
          </div>
        ) : null}
      </div>
    </div>
  );
}
