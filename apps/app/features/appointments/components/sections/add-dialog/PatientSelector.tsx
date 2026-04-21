import React from "react";
import { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { Patient } from "@workspace/types";

interface PatientSelectorProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  patients: Patient[];
  patientsLoading: boolean;
  patientSearch: string;
  setPatientSearch: (search: string) => void;
  patientComboboxOpen: boolean;
  setPatientComboboxOpen: (open: boolean) => void;
}

export function PatientSelector<T extends FieldValues>({
  form,
  patients,
  patientsLoading,
  patientSearch,
  setPatientSearch,
  patientComboboxOpen,
  setPatientComboboxOpen,
}: PatientSelectorProps<T>) {
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const selectablePatients = React.useMemo(
    () => patients.filter((p) => typeof p.id === "string" && p.id.length > 0),
    [patients],
  );

  React.useEffect(() => {
    setActiveIndex(-1);
  }, [patientSearch, patientComboboxOpen]);

  return (
    <FormField
      control={form.control}
      name={"patientId" as Path<T>}
      render={({ field }) => {
        const selectedPatient = selectablePatients.find(
          (p) => p.id === field.value,
        );
        const selectedLabel = selectedPatient
          ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
          : null;

        const selectPatient = (patientId: string) => {
          field.onChange(patientId as PathValue<T, Path<T>>);
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
            const patient = selectablePatients[activeIndex];
            if (patient?.id) {
              event.preventDefault();
              selectPatient(patient.id);
            }
          }
        };

        return (
          <FormItem className="flex flex-col">
            <FormLabel>Patient</FormLabel>
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
                      "min-h-11 w-full justify-between gap-3",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    <span className="truncate text-left">
                      {selectedLabel ?? "Patient"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent
                className="z-[100] w-[--radix-popover-trigger-width] min-w-[280px] p-0"
                align="start"
              >
                <div className="flex items-center gap-2 border-b px-3 py-2">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search patients"
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
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Searching...</span>
                    </div>
                  ) : selectablePatients.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No patients found
                    </p>
                  ) : (
                    <ul role="listbox" className="space-y-0.5">
                      {selectablePatients.map((patient, index) => {
                        const patientId = patient.id as string;
                        const isSelected = patientId === field.value;
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
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
