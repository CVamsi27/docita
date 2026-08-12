import { Check } from "lucide-react";
import type { LabTest, Patient } from "@workspace/types";
import { getPatientFullName } from "@workspace/utils";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { CommandEmpty, CommandGroup } from "@workspace/ui/components/overlay/command";
import { cn } from "@workspace/ui/lib/utils";

export type LabTestFormatCurrency = (
  amount: number,
  options?: { fractionDigits?: number },
) => string;

/**
 * Shared selection state threaded from the order-lab-test dialog into its
 * combobox fields. Kept as one type so the dialog and its field components
 * cannot drift apart.
 */
export interface LabTestOrderComboboxState {
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

export function PatientCommandList({
  patients,
  patientsLoading,
  patientSearch,
  selectedPatientId,
  onSelect,
}: {
  patients: Patient[];
  patientsLoading: boolean;
  patientSearch: string;
  selectedPatientId: string | undefined;
  onSelect: (patientId: string) => void;
}) {
  if (patientsLoading) return <ComboboxLoading label="Searching…" />;
  if (patients.length === 0) {
    return (
      <CommandEmpty>
        {patientSearch ? "No patient found" : "Type to search patients…"}
      </CommandEmpty>
    );
  }
  const selectablePatients = patients.filter(hasStringId);
  return (
    <CommandGroup>
      {selectablePatients.map((patient) => (
        <PatientOption
          key={patient.id}
          patient={patient}
          selected={selectedPatientId === patient.id}
          onSelect={onSelect}
        />
      ))}
    </CommandGroup>
  );
}

export function TestCommandList({
  catalogLoading,
  formatCurrency,
  selectedTestId,
  testCatalog,
  testSearch,
  onSelect,
}: {
  catalogLoading: boolean;
  formatCurrency: LabTestFormatCurrency;
  selectedTestId: string | undefined;
  testCatalog: LabTest[];
  testSearch: string;
  onSelect: (testId: string) => void;
}) {
  if (catalogLoading) return <ComboboxLoading label="Loading tests…" />;
  const visibleTests = testCatalog
    .filter(hasStringId)
    .filter((test) =>
      test.name.toLowerCase().includes(testSearch.toLowerCase()),
    );
  if (visibleTests.length === 0) return <CommandEmpty>No tests available</CommandEmpty>;
  return (
    <CommandGroup>
      {visibleTests.map((test) => (
        <TestOption
          key={test.id}
          formatCurrency={formatCurrency}
          selected={selectedTestId === test.id}
          test={test}
          onSelect={onSelect}
        />
      ))}
    </CommandGroup>
  );
}

function ComboboxLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-6">
      <DocitaLoadingIndicator variant="inline" decorative />
      <span className="ml-2 text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function PatientOption({
  patient,
  selected,
  onSelect,
}: {
  patient: Patient & { id: string };
  selected: boolean;
  onSelect: (patientId: string) => void;
}) {
  return (
    <div
      onClick={() => onSelect(patient.id)}
      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
    >
      <OptionCheck selected={selected} />
      <div className="flex flex-col">
        <span>{getPatientFullName(patient)}</span>
        {patient.phoneNumber ? (
          <span className="text-xs text-muted-foreground">
            {patient.phoneNumber}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function TestOption({
  formatCurrency,
  selected,
  test,
  onSelect,
}: {
  formatCurrency: LabTestFormatCurrency;
  selected: boolean;
  test: LabTest & { id: string };
  onSelect: (testId: string) => void;
}) {
  return (
    <div
      onClick={() => onSelect(test.id)}
      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
    >
      <OptionCheck selected={selected} />
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
  );
}

function OptionCheck({ selected }: { selected: boolean }) {
  return (
    <Check
      className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")}
    />
  );
}

function hasStringId<T extends { id?: string | null }>(
  item: T,
): item is T & { id: string } {
  return typeof item.id === "string" && item.id.length > 0;
}
