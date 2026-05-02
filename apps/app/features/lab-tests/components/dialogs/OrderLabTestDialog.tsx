import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";
import { Button } from "@workspace/ui/components/button";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
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
  CommandList,
} from "@workspace/ui/components/command";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { FormProvider, UseFormReturn } from "react-hook-form";

import { LabTest, Patient } from "@workspace/types";
import { CreateLabTestOrderInput } from "@/features/lab-tests/hooks/use-lab-tests-logic";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";

interface OrderLabTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<CreateLabTestOrderInput>;
  onSubmit: (data: CreateLabTestOrderInput) => void;
  isCreating: boolean;
  patients: Patient[];
  patientsLoading: boolean;
  testCatalog: LabTest[];
  catalogLoading: boolean;
  patientSearch: string;
  setPatientSearch: (value: string) => void;
  testSearch: string;
  setTestSearch: (value: string) => void;
  patientComboboxOpen: boolean;
  setPatientComboboxOpen: (open: boolean) => void;
  testComboboxOpen: boolean;
  setTestComboboxOpen: (open: boolean) => void;
  selectedPatient: Patient | undefined;
  selectedTest: LabTest | undefined;
}

export function OrderLabTestDialog({
  open,
  onOpenChange,
  form,
  onSubmit,
  isCreating,
  patients,
  patientsLoading,
  testCatalog,
  catalogLoading,
  patientSearch,
  setPatientSearch,
  testSearch,
  setTestSearch,
  patientComboboxOpen,
  setPatientComboboxOpen,
  testComboboxOpen,
  setTestComboboxOpen,
  selectedPatient,
  selectedTest,
}: OrderLabTestDialogProps) {
  const { formatCurrency } = useClinicCurrency();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Order Lab Test</DialogTitle>
          <DialogDescription>
            Create a new lab test order for a patient
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Patient</FormLabel>
                  <Popover
                    open={patientComboboxOpen}
                    onOpenChange={(nextOpen) => {
                      setPatientComboboxOpen(nextOpen);
                      if (!nextOpen) setPatientSearch("");
                    }}
                    modal={true}
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
                          {selectedPatient
                            ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                            : "Search patient by name…"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[400px] p-0 z-100"
                      align="start"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Enter patient name"
                          value={patientSearch}
                          onValueChange={setPatientSearch}
                          showClearButton
                        />
                        <CommandList>
                          {patientsLoading ? (
                            <div className="flex items-center justify-center py-6">
                              <DocitaLoadingIndicator variant="inline" decorative />
                              <span className="ml-2 text-sm text-muted-foreground">
                                Searching…
                              </span>
                            </div>
                          ) : patients.length === 0 ? (
                            <CommandEmpty>
                              {patientSearch
                                ? "No patient found"
                                : "Type to search patients…"}
                            </CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {patients.map((patient) => (
                                <div
                                  key={patient.id}
                                  onClick={() => {
                                    field.onChange(patient.id);
                                    setPatientComboboxOpen(false);
                                  }}
                                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === patient.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>
                                      {patient.firstName} {patient.lastName}
                                    </span>
                                    {patient.phoneNumber && (
                                      <span className="text-xs text-muted-foreground">
                                        {patient.phoneNumber}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="labTestId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Test</FormLabel>
                  <Popover
                    open={testComboboxOpen}
                    onOpenChange={(nextOpen) => {
                      setTestComboboxOpen(nextOpen);
                      if (!nextOpen) setTestSearch("");
                    }}
                    modal={true}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          type="button"
                          aria-expanded={testComboboxOpen}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {selectedTest
                            ? selectedTest.name
                            : "Search test by name…"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[400px] p-0 z-100"
                      align="start"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Enter test name"
                          value={testSearch}
                          onValueChange={setTestSearch}
                          showClearButton
                        />
                        <CommandList>
                          {catalogLoading ? (
                            <div className="flex items-center justify-center py-6">
                              <DocitaLoadingIndicator variant="inline" decorative />
                              <span className="ml-2 text-sm text-muted-foreground">
                                Loading tests…
                              </span>
                            </div>
                          ) : testCatalog.length === 0 ? (
                            <CommandEmpty>No tests available</CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {testCatalog
                                .filter((test: LabTest) =>
                                  test.name
                                    .toLowerCase()
                                    .includes(testSearch.toLowerCase()),
                                )
                                .map((test: LabTest) => (
                                  <div
                                    key={test.id}
                                    onClick={() => {
                                      field.onChange(test.id);
                                      setTestComboboxOpen(false);
                                    }}
                                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === test.id
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    <div className="flex flex-col flex-1">
                                      <span>{test.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {test.category}
                                        {test.price &&
                                          ` • ${formatCurrency(test.price, {
                                            fractionDigits: 0,
                                          })}`}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter lab notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="gap-2">
                {isCreating && <DocitaLoadingIndicator variant="inline" decorative />}
                {isCreating ? "Creating…" : "Order Test"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
