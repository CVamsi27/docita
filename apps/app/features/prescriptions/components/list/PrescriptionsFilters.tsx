import React from "react";
import { Input } from "@workspace/ui/components/input";
import { Search } from "lucide-react";

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
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Enter patient, diagnosis, or phone"
          className="pl-9 bg-background"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </div>
  );
}
