"use client";

import { Search } from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

interface Doctor {
  id: string;
  name: string;
}

interface QueueFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedDoctor: string;
  onDoctorChange: (value: string) => void;
  doctors: Doctor[];
  showDoctorFilter: boolean;
}

export function QueueFilters({
  searchQuery,
  onSearchChange,
  selectedDoctor,
  onDoctorChange,
  doctors,
  showDoctorFilter,
}: QueueFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by patient, token, or doctor..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      {showDoctorFilter && (
        <Select value={selectedDoctor} onValueChange={onDoctorChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Doctors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Doctors</SelectItem>
            {doctors.map((doctor) => (
              <SelectItem key={doctor.id} value={doctor.id}>
                {doctor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
