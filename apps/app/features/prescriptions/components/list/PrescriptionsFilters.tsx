import React, { useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { IsoDatePickerField } from "@workspace/ui/components/iso-date-picker-field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { usePatients } from "@/hooks/api/use-patients";
import type { Patient } from "@workspace/types";

type PatientOption = Patient & { id: string };

interface PrescriptionsFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (iso: string) => void;
  onEndDateChange: (iso: string) => void;
  patientId: string;
  onPatientIdChange: (patientId: string) => void;
}

export function PrescriptionsFilters({
  searchQuery,
  setSearchQuery,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  patientId,
  onPatientIdChange,
}: PrescriptionsFiltersProps) {
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const { data: patientsResponse, isLoading: patientsLoading } = usePatients({
    search: patientSearch.trim() ? patientSearch : undefined,
    limit: patientSearch.trim() ? 20 : 10,
  });

  const patients = useMemo(() => patientsResponse?.items ?? [], [patientsResponse]);
  const selectablePatients = useMemo(
    () =>
      patients.filter(
        (p): p is PatientOption => typeof p?.id === "string" && p.id.length > 0,
      ),
    [patients],
  );

  const selectedPatient = useMemo(
    () => selectablePatients.find((p) => p.id === patientId),
    [patientId, selectablePatients],
  );

  const selectedPatientLabel = selectedPatient
    ? `${selectedPatient.firstName ?? ""} ${selectedPatient.lastName ?? ""}`.trim()
    : "";

  const clearDaysDisabled = startDate.trim().length === 0 && endDate.trim().length === 0;
  const clearPatientDisabled = patientId.trim().length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
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

        <div className="grid w-full gap-2 sm:w-auto">
          <Label htmlFor="prescriptions-filter-start" className="text-xs text-muted-foreground">
            From
          </Label>
          <IsoDatePickerField
            id="prescriptions-filter-start"
            label=""
            showLabel={false}
            value={startDate}
            onChange={onStartDateChange}
            placeholder="Select start date"
            triggerClassName="w-full sm:w-[200px]"
          />
        </div>

        <div className="grid w-full gap-2 sm:w-auto">
          <Label htmlFor="prescriptions-filter-end" className="text-xs text-muted-foreground">
            To
          </Label>
          <IsoDatePickerField
            id="prescriptions-filter-end"
            label=""
            showLabel={false}
            value={endDate}
            onChange={onEndDateChange}
            placeholder="Select end date"
            triggerClassName="w-full sm:w-[200px]"
          />
        </div>

        <div className="grid w-full gap-2 sm:w-auto sm:shrink-0">
          <Label
            className="text-xs text-muted-foreground invisible select-none pointer-events-none"
            aria-hidden
          >
            From
          </Label>
          <SymbolTooltip label="Show all days (no date filter)">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full px-4 font-normal sm:w-auto"
              disabled={clearDaysDisabled}
              onClick={() => {
                onStartDateChange("");
                onEndDateChange("");
              }}
            >
              All days
            </Button>
          </SymbolTooltip>
        </div>

        <div className="grid w-full gap-2 sm:w-[260px]">
          <Label className="text-xs text-muted-foreground">Patient</Label>
          <Popover
            open={patientComboboxOpen}
            onOpenChange={setPatientComboboxOpen}
            modal={false}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-between font-normal"
                aria-label="Patient filter"
              >
                <span className="truncate">
                  {selectedPatientLabel || "All patients"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-2" align="start">
              <div className="space-y-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Enter patient name or phone"
                    className="pl-9"
                    aria-label="Search patients"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto rounded-md border border-border/60">
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted/40",
                      !patientId && "bg-muted/20",
                    )}
                    onClick={() => {
                      onPatientIdChange("");
                      setPatientComboboxOpen(false);
                    }}
                  >
                    <Check
                      className={cn("h-4 w-4", !patientId ? "opacity-100" : "opacity-0")}
                      aria-hidden
                    />
                    <span className="truncate">All patients</span>
                  </button>

                  {patientsLoading ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Loading patients…
                    </div>
                  ) : selectablePatients.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No patients found
                    </div>
                  ) : (
                    selectablePatients.map((p) => {
                      const label = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Patient";
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted/40",
                            p.id === patientId && "bg-muted/20",
                          )}
                          onClick={() => {
                            onPatientIdChange(p.id);
                            setPatientComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              p.id === patientId ? "opacity-100" : "opacity-0",
                            )}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                          {p.phoneNumber ? (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {p.phoneNumber}
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={clearPatientDisabled}
                    onClick={() => {
                      onPatientIdChange("");
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPatientComboboxOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
