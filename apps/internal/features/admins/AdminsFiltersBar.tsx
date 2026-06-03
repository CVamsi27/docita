"use client";

import { Plus, Search } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/indicators/card";

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
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter name or email"
                value={adminSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={selectedClinic} onValueChange={onClinicChange}>
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder="Facility" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(clinics) &&
                clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button onClick={onAddAdmin}>
            <Plus className="h-4 w-4 mr-2" />
            Add Admin
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
