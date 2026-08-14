import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Textarea } from "@workspace/ui/components/form/form-primitives";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components";
import { FormProvider, UseFormReturn } from "react-hook-form";
import { CreateLabTestOrderInput } from "@/features/lab-tests/hooks/use-lab-tests-logic";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import { OrderLabTestComboboxFields } from "./order-lab-test-combobox-fields";
import { OrderLabSelectField } from "./order-lab-select-field";
import type { LabTestOrderComboboxState } from "./order-lab-test-combobox-options";

interface OrderLabTestDialogProps extends LabTestOrderComboboxState {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<CreateLabTestOrderInput>;
  onSubmit: (data: CreateLabTestOrderInput) => void;
  isCreating: boolean;
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
  const { currency } = useLocaleCurrency();
  const formatCurrency = (amount: number, options?: { fractionDigits?: number }) =>
    formatCurrencyUtil(amount, currency, options ?? {});

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

            <OrderLabSelectField form={form} />

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
