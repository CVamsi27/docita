import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import React from "react";
import { FormControl } from "@workspace/ui/components/form/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/overlay/popover";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { Patient } from "@workspace/types";

interface PatientSelectorProps {
  value: string;
  onChange: (patientId: string) => void;
  patients: Patient[];
  patientsLoading: boolean;
  patientSearch: string;
  setPatientSearch: (search: string) => void;
  patientComboboxOpen: boolean;
  setPatientComboboxOpen: (open: boolean) => void;
}

export function PatientSelector({
  value,
  onChange,
  patients,
  patientsLoading,
  patientSearch,
  setPatientSearch,
  patientComboboxOpen,
  setPatientComboboxOpen,
}: PatientSelectorProps) {
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const hasSearch = patientSearch.trim().length > 0;

  const selectablePatients = React.useMemo(
    () =>
      patients.flatMap((p) =>
        typeof p.id === "string" && p.id.length > 0
          ? [{ patient: p, id: p.id }]
          : [],
      ),
    [patients],
  );

  React.useEffect(() => {
    setActiveIndex(-1);
  }, [patientSearch, patientComboboxOpen]);

  const selectedEntry = selectablePatients.find((entry) => entry.id === value);
  const selectedLabel = selectedEntry
    ? `${selectedEntry.patient.firstName} ${selectedEntry.patient.lastName}`
    : null;

  const selectPatient = (patientId: string) => {
    onChange(patientId);
    setPatientComboboxOpen(false);
  };

  const handleInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (selectablePatients.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) =>
        prev < selectablePatients.length - 1 ? prev + 1 : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) =>
        prev <= 0 ? selectablePatients.length - 1 : prev - 1,
      );
    } else if (event.key === "Enter") {
      if (activeIndex < 0) return;
      const entry = selectablePatients[activeIndex];
      if (entry) {
        event.preventDefault();
        selectPatient(entry.id);
      }
    }
  };

  return (
    <Popover
      open={patientComboboxOpen}
      onOpenChange={setPatientComboboxOpen}
      modal={false}
    >
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            type="button"
            aria-expanded={patientComboboxOpen}
            className={cn(
              "min-h-11 w-full min-w-0 shrink justify-between gap-3 aria-invalid:border-destructive aria-invalid:bg-destructive/5 aria-invalid:ring-destructive/20",
              !value && "text-muted-foreground",
            )}
          >
            <span className="truncate text-left">
              {selectedLabel ?? "Search and select a patient"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent
        className="z-[100] w-[min(100vw-2rem,280px)] max-w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Patient name"
              value={patientSearch}
              onChange={(event) => setPatientSearch(event.target.value)}
              onKeyDown={handleInputKeyDown}
              className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>

          <div className="max-h-[280px] overflow-y-auto p-1">
            {patientsLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <DocitaLoadingIndicator variant="inline" decorative />
                <span>Searching…</span>
              </div>
            ) : selectablePatients.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm font-medium text-foreground">
                  {hasSearch
                    ? "No matching patients"
                    : "Start typing to search patients"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasSearch
                    ? "Check the spelling or phone number and try again."
                    : "Search results will appear here."}
                </p>
              </div>
            ) : (
              <ul role="listbox" className="space-y-0.5">
                {selectablePatients.map((entry, index) => {
                  const { id: patientId, patient } = entry;
                  const isSelected = patientId === value;
                  const isActive = index === activeIndex;
                  return (
                    <li key={patientId}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => selectPatient(patientId)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          isActive && "bg-accent text-accent-foreground",
                          isSelected && !isActive && "bg-accent/60",
                        )}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">
                            {patient.firstName} {patient.lastName}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {patient.phoneNumber}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>
  );
}
