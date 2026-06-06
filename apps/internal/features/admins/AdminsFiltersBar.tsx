"use client";

import { Plus } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { InternalTableToolbar } from "@/components/common/internal-table-toolbar";

interface FiltersBarProps {
  adminSearch: string;
  onSearchChange: (value: string) => void;
  selectedClinic: string;
  onClinicChange: (value: string) => void;
  clinics: { id: string; name: string }[];
  onAddAdmin: () => void;
}

export function AdminsFiltersBar({
  adminSearch,
  onSearchChange,
  selectedClinic,
  onClinicChange,
  clinics,
  onAddAdmin,
}: FiltersBarProps) {
  return (
    <InternalTableToolbar
      searchValue={adminSearch}
      onSearchChange={onSearchChange}
      searchPlaceholder="Enter name or email"
      filterValue={selectedClinic}
      onFilterChange={onClinicChange}
      filterOptions={clinics.map((c) => ({
        value: c.id,
        label: c.name,
      }))}
      filterPlaceholder="Facility"
      actionSlot={
        <Button onClick={onAddAdmin}>
          <Plus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      }
    />
  );
}
