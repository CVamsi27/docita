import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button } from "@workspace/ui/components/form/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { FormProvider, UseFormReturn } from "react-hook-form";

import { LabTest, Patient } from "@workspace/types";
import { CreateLabTestOrderInput } from "@/features/lab-tests/hooks/use-lab-tests-logic";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { OrderLabTestComboboxFields } from "./order-lab-test-combobox-fields";

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
            <OrderLabTestComboboxFields
              form={form}
              patients={patients}
              patientsLoading={patientsLoading}
              testCatalog={testCatalog}
              catalogLoading={catalogLoading}
              patientSearch={patientSearch}
              setPatientSearch={setPatientSearch}
              testSearch={testSearch}
              setTestSearch={setTestSearch}
              patientComboboxOpen={patientComboboxOpen}
              setPatientComboboxOpen={setPatientComboboxOpen}
              testComboboxOpen={testComboboxOpen}
              setTestComboboxOpen={setTestComboboxOpen}
              selectedPatient={selectedPatient}
              selectedTest={selectedTest}
              formatCurrency={formatCurrency}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter lab notes" {...field} />
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
                {isCreating && (
                  <DocitaLoadingIndicator variant="inline" decorative />
                )}
                {isCreating ? "Creating…" : "Order Test"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
