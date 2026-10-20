import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components";
import { X } from "lucide-react";
import type { InternalOperator } from "@workspace/types";
import { LEAD_STATUS_LABELS } from "../lib/lead-status-labels";

/** Sentinel for "no filter" — Radix Select items cannot use empty values. */
export const FILTER_ALL = "ALL";
/** Sentinel the API understands for leads with no assigned owner. */
export const OWNER_UNASSIGNED = "UNASSIGNED";

export interface ReferrerOption {
  id: string;
  name: string;
}

interface LeadsFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  ownerFilter: string;
  onOwnerFilterChange: (v: string) => void;
  referrerFilter: string;
  onReferrerFilterChange: (v: string) => void;
  ageFilter: string;
  onAgeFilterChange: (v: string) => void;
  locationDraft: string;
  onLocationDraftChange: (v: string) => void;
  locationFilter: string;
  onApplyLocation: () => void;
  onClearLocation: () => void;
  duplicateFilter: string;
  onDuplicateFilterChange: (v: string) => void;
  consentFilter: string;
  onConsentFilterChange: (v: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  operators: InternalOperator[];
  referrers: ReferrerOption[];
}

export function LeadsFilters({
  statusFilter,
  onStatusFilterChange,
  ownerFilter,
  onOwnerFilterChange,
  referrerFilter,
  onReferrerFilterChange,
  ageFilter,
  onAgeFilterChange,
  locationDraft,
  onLocationDraftChange,
  locationFilter,
  onApplyLocation,
  onClearLocation,
  duplicateFilter,
  onDuplicateFilterChange,
  consentFilter,
  onConsentFilterChange,
  hasActiveFilters,
  onClearFilters,
  operators,
  referrers,
}: LeadsFiltersProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-44 space-y-1">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>All statuses</SelectItem>
            {Object.entries(LEAD_STATUS_LABELS).map(([status, label]) => (
              <SelectItem key={status} value={status}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-44 space-y-1">
        <Label className="text-xs text-muted-foreground">Owner</Label>
        <Select value={ownerFilter} onValueChange={onOwnerFilterChange}>
          <SelectTrigger aria-label="Filter by owner">
            <SelectValue placeholder="All owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>All owners</SelectItem>
            <SelectItem value={OWNER_UNASSIGNED}>Unassigned</SelectItem>
            {operators.map((operator) => (
              <SelectItem key={operator.id} value={operator.id}>
                {operator.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-44 space-y-1">
        <Label className="text-xs text-muted-foreground">Partner</Label>
        <Select value={referrerFilter} onValueChange={onReferrerFilterChange}>
          <SelectTrigger aria-label="Filter by partner">
            <SelectValue placeholder="All partners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>All partners</SelectItem>
            {referrers.map((referrer) => (
              <SelectItem key={referrer.id} value={referrer.id}>
                {referrer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-40 space-y-1">
        <Label className="text-xs text-muted-foreground">Age</Label>
        <Select value={ageFilter} onValueChange={onAgeFilterChange}>
          <SelectTrigger aria-label="Filter by age">
            <SelectValue placeholder="Any age" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Any age</SelectItem>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-48 space-y-1">
        <Label className="text-xs text-muted-foreground">Location</Label>
        <div className="relative">
          <Input
            aria-label="Filter by location"
            placeholder="City or state"
            value={locationDraft}
            onChange={(event) => onLocationDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onApplyLocation();
            }}
            onBlur={onApplyLocation}
          />
          {locationFilter && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Clear location filter"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onMouseDown={(event) => event.preventDefault()}
              onClick={onClearLocation}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="min-w-44 space-y-1">
        <Label className="text-xs text-muted-foreground">Duplicate</Label>
        <Select value={duplicateFilter} onValueChange={onDuplicateFilterChange}>
          <SelectTrigger aria-label="Filter by duplicate flag">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Any</SelectItem>
            <SelectItem value="flagged">Flagged duplicates</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-40 space-y-1">
        <Label className="text-xs text-muted-foreground">Consent</Label>
        <Select value={consentFilter} onValueChange={onConsentFilterChange}>
          <SelectTrigger aria-label="Filter by consent">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Any</SelectItem>
            <SelectItem value="true">Consented</SelectItem>
            <SelectItem value="false">Not consented</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
