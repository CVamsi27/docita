"use client";

import { Search } from "lucide-react";
import { Input } from "@workspace/ui/components/form/input";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/indicators/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";

interface InternalTableToolbarFilterOption {
  value: string;
  label: string;
}

interface InternalTableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filterValue: string;
  onFilterChange: (value: string) => void;
  filterOptions: InternalTableToolbarFilterOption[];
  filterPlaceholder: string;
  filterAllLabel?: string;
  actionSlot?: React.ReactNode;
}

export function InternalTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filterValue,
  onFilterChange,
  filterOptions,
  filterPlaceholder,
  filterAllLabel,
  actionSlot,
}: InternalTableToolbarProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={filterValue} onValueChange={onFilterChange}>
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder={filterPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {filterAllLabel ? (
                <SelectItem value="all">{filterAllLabel}</SelectItem>
              ) : null}
              {filterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {actionSlot}
        </div>
      </CardContent>
    </Card>
  );
}
