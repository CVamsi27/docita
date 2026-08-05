import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { ChevronsUpDown } from "lucide-react";
import type { LabTest, Patient } from "@workspace/types";
import { getPatientFullName } from "@workspace/utils";
import { Button, Command, CommandInput, CommandList, FormControl, FormField, FormItem, FormLabel, FormMessage, Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import type { CreateLabTestOrderInput } from "@/features/lab-tests/hooks/use-lab-tests-logic";
import { PatientCommandList, TestCommandList, type LabTestFormatCurrency, type LabTestOrderComboboxState } from "./order-lab-test-combobox-options";

interface OrderLabTestComboboxFieldsProps extends LabTestOrderComboboxState {
  form: UseFormReturn<CreateLabTestOrderInput>;
  formatCurrency: LabTestFormatCurrency;
}

interface PatientFieldProps {
  form: UseFormReturn<CreateLabTestOrderInput>;
  patients: Patient[];
  patientsLoading: boolean;
  patientSearch: string;
  setPatientSearch: (value: string) => void;
  patientComboboxOpen: boolean;
  setPatientComboboxOpen: (open: boolean) => void;
  selectedPatient: Patient | undefined;
}

interface TestFieldProps {
  form: UseFormReturn<CreateLabTestOrderInput>;
  testCatalog: LabTest[];
  catalogLoading: boolean;
  testSearch: string;
  setTestSearch: (value: string) => void;
  testComboboxOpen: boolean;
  setTestComboboxOpen: (open: boolean) => void;
  selectedTest: LabTest | undefined;
  formatCurrency: LabTestFormatCurrency;
}

export function OrderLabTestComboboxFields(
  props: OrderLabTestComboboxFieldsProps,
) {
  return (
    <>
      <OrderPatientComboboxField {...props} />
      <OrderTestComboboxField {...props} />
    </>
  );
}
function OrderPatientComboboxField({
  form,
  patients,
  patientsLoading,
  patientSearch,
  setPatientSearch,
  patientComboboxOpen,
  setPatientComboboxOpen,
  selectedPatient,
}: PatientFieldProps) {
  return (
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
                <ComboboxButton
                  expanded={patientComboboxOpen}
                  muted={!field.value}
                  label={
                    selectedPatient
                      ? getPatientFullName(selectedPatient)
                      : "Search patient by name…"
                  }
                />
              </FormControl>
            </PopoverTrigger>
            <ComboboxContent
              placeholder="Enter patient name"
              search={patientSearch}
              setSearch={setPatientSearch}
            >
              <PatientCommandList
                patients={patients}
                patientsLoading={patientsLoading}
                patientSearch={patientSearch}
                selectedPatientId={field.value}
                onSelect={(patientId) => {
                  field.onChange(patientId);
                  setPatientComboboxOpen(false);
                }}
              />
            </ComboboxContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
function OrderTestComboboxField({
  form,
  testCatalog,
  catalogLoading,
  testSearch,
  setTestSearch,
  testComboboxOpen,
  setTestComboboxOpen,
  selectedTest,
  formatCurrency,
}: TestFieldProps) {
  return (
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
                <ComboboxButton
                  expanded={testComboboxOpen}
                  muted={!field.value}
                  label={selectedTest ? selectedTest.name : "Search test by name…"}
                />
              </FormControl>
            </PopoverTrigger>
            <ComboboxContent
              placeholder="Enter test name"
              search={testSearch}
              setSearch={setTestSearch}
            >
              <TestCommandList
                catalogLoading={catalogLoading}
                formatCurrency={formatCurrency}
                selectedTestId={field.value}
                testCatalog={testCatalog}
                testSearch={testSearch}
                onSelect={(testId) => {
                  field.onChange(testId);
                  setTestComboboxOpen(false);
                }}
              />
            </ComboboxContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ComboboxButton({
  expanded,
  muted,
  label,
}: {
  expanded: boolean;
  muted: boolean;
  label: string;
}) {
  return (
    <Button
      variant="outline"
      role="combobox"
      type="button"
      aria-expanded={expanded}
      className={cn("w-full justify-between", muted && "text-muted-foreground")}
    >
      {label}
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );
}

function ComboboxContent({
  placeholder,
  search,
  setSearch,
  children,
}: {
  placeholder: string;
  search: string;
  setSearch: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <PopoverContent
      className="w-[min(100vw-2rem,400px)] p-0 z-100"
      align="start"
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder={placeholder}
          value={search}
          onValueChange={setSearch}
          showClearButton
        />
        <CommandList>{children}</CommandList>
      </Command>
    </PopoverContent>
  );
}
