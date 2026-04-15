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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { Button } from "@workspace/ui/components/button";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
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
  return (
    <FormField
      control={form.control}
      name={"patientId" as Path<T>}
      render={({ field }) => (
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
                    "w-full justify-between",
                    !field.value && "text-muted-foreground",
                  )}
                >
                  {field.value
                    ? (() => {
                        const patient = patients.find(
                          (p) => p.id === field.value,
                        );
                        return patient
                          ? `${patient.firstName} ${patient.lastName}`
                          : "Select patient";
                      })()
                    : "Select patient"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 z-[100]" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search patients..."
                  value={patientSearch}
                  onValueChange={setPatientSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    {patientsLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Searching...</span>
                      </div>
                    ) : (
                      "No patients found"
                    )}
                  </CommandEmpty>
                  <CommandGroup heading="Patients">
                    {patients.map((patient) => (
                      <CommandItem
                        key={patient.id}
                        value={patient.id}
                        className="cursor-pointer"
                        onSelect={() => {
                          if (patient.id) {
                            field.onChange(
                              patient.id as PathValue<T, Path<T>>,
                            );
                          }
                          setPatientComboboxOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            patient.id === field.value
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{`${patient.firstName} ${patient.lastName}`}</span>
                          <span className="text-xs text-muted-foreground mr-2">
                            {patient.phoneNumber}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
