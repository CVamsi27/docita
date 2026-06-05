import { getPatientFullName } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Input } from "@workspace/ui/components/form/input";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { Search, X } from "lucide-react";
import type { Patient } from "@workspace/types";

interface PatientSearchSectionProps {
  search: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  patientsLoading: boolean;
  patientsData: { items: Patient[] } | undefined;
  onSelectPatient: (patient: Patient) => void;
}

export function PatientSearchSection({
  search,
  onSearchChange,
  onClearSearch,
  patientsLoading,
  patientsData,
  onSelectPatient,
}: PatientSearchSectionProps) {
  const showClear = !!search.trim();

  return (
    <Card className="ui-card-surface">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Select Patient</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Enter name or phone"
            data-testid="dental-chart-patient-search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className={showClear ? "pl-9 pr-10" : "pl-9"}
            aria-label="Search patients for dental chart"
          />
          {showClear && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              <SymbolTooltip label="Clear search">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onClearSearch}
                  aria-label="Clear search"
                >
                  <X
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                </Button>
              </SymbolTooltip>
            </div>
          )}
        </div>

        {patientsLoading && search.length >= 2 && (
          <div
            className="space-y-2"
            role="status"
            aria-live="polite"
            aria-label="Loading patient search"
          >
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}

        {search.length >= 2 &&
          !patientsLoading &&
          (patientsData?.items ?? []).map((patient) => (
            <button
              key={patient.id}
              type="button"
              data-testid="dental-chart-patient-result"
              onClick={() => onSelectPatient(patient)}
              className="w-full text-left rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors"
            >
              <p className="text-sm font-medium">
                {getPatientFullName(patient)}
              </p>
              <p className="text-xs text-muted-foreground">
                {patient.phoneNumber}
              </p>
            </button>
          ))}
      </CardContent>
    </Card>
  );
}
