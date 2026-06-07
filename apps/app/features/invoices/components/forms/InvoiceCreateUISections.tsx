"use client";

import { useWatch, type Control, type UseFormSetValue, type UseFieldArrayAppend, type UseFieldArrayRemove, type FieldArrayWithId } from "react-hook-form";
import type { CreateInvoiceFormValues, Patient } from "@workspace/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { PatientSelector } from "@/features/appointments";
import { createInvoiceItemFieldPath } from "@/features/invoices/lib/invoice-form-paths";
import {
  InvoiceLineItemsSection,
  InvoiceNotesSection,
  computeInvoiceItems,
  buildInvoiceItemUpdateHandler,
  EMPTY_INVOICE_ITEM,
} from "./invoice-form-sections-shared";

export function InvoiceCreateDetailsSection({
  control,
  patients,
  patientsLoading,
  patientSearch,
  setPatientSearch,
  patientComboboxOpen,
  setPatientComboboxOpen,
}: {
  control: Control<CreateInvoiceFormValues>;
  patients: Patient[];
  patientsLoading: boolean;
  patientSearch: string;
  setPatientSearch: (value: string) => void;
  patientComboboxOpen: boolean;
  setPatientComboboxOpen: (value: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice details</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <div className="col-span-full min-w-0 sm:col-span-1">
          <FormField
            control={control}
            name="patientId"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Patient</FormLabel>
                <PatientSelector
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  patients={patients}
                  patientsLoading={patientsLoading}
                  patientSearch={patientSearch}
                  setPatientSearch={setPatientSearch}
                  patientComboboxOpen={patientComboboxOpen}
                  setPatientComboboxOpen={setPatientComboboxOpen}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

export function InvoiceCreateLineItemsSection({
  control,
  setValue,
  fields,
  append,
  remove,
  totalAmount,
}: {
  control: Control<CreateInvoiceFormValues>;
  setValue: UseFormSetValue<CreateInvoiceFormValues>;
  fields: FieldArrayWithId<CreateInvoiceFormValues, "items">[];
  append: UseFieldArrayAppend<CreateInvoiceFormValues, "items">;
  remove: UseFieldArrayRemove;
  totalAmount: number;
}) {
  const watchedItems = useWatch({ control, name: "items" }) || [];
  const computedItems = computeInvoiceItems(fields, watchedItems);
  const onUpdateItem = buildInvoiceItemUpdateHandler(
    (path, value) => setValue(path as never, value as never),
    createInvoiceItemFieldPath,
  );

  return (
    <InvoiceLineItemsSection
      items={computedItems}
      onUpdateItem={onUpdateItem}
      onRemoveItem={remove}
      onAddItem={() => append(EMPTY_INVOICE_ITEM)}
      totalAmount={totalAmount}
      control={control}
    />
  );
}

export function InvoiceCreateNotesSection({
  control,
}: {
  control: Control<CreateInvoiceFormValues>;
}) {
  return <InvoiceNotesSection control={control} />;
}
