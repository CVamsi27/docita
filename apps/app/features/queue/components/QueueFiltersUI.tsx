"use client";

import { FC } from "react";
import { Input } from "@workspace/ui/components/input";
import { Search, Filter } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
}

interface QueueFiltersProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedDoctor?: string;
  onDoctorChange?: (doctorId: string) => void;
  doctors?: Doctor[];
  showDoctorFilter?: boolean;
}

export const QueueFilters: FC<QueueFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedDoctor,
  onDoctorChange,
  doctors = [],
  showDoctorFilter,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients..."
          className="pl-10"
          value={searchQuery ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>
      {showDoctorFilter && doctors.length > 0 && (
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <select
            className="pl-10 h-10 rounded-md border bg-background px-3 py-2 text-sm min-w-[200px]"
            value={selectedDoctor ?? ""}
            onChange={(e) => onDoctorChange?.(e.target.value)}
          >
            <option value="">All Doctors</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export type { QueueFiltersProps };
