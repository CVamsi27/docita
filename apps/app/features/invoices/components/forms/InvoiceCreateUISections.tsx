"use client";

import { useWatch, type Control, type UseFormSetValue, type UseFieldArrayAppend, type UseFieldArrayRemove, type FieldArrayWithId } from "react-hook-form";
import type { CreateInvoiceFormValues, InvoiceLineItemFormValues } from "@workspace/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
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
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Plus } from "lucide-react";
import { createInvoiceItemFieldPath } from "@/features/invoices/lib/invoice-form-paths";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceSubtotal } from "./InvoiceSubtotal";
import { PatientSelector } from "@/features/appointments";
import { formatCurrency } from "@workspace/utils";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patients: any[];
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

  const items = fields.map((field, index) => {
    const item = watchedItems[index] ?? {};
    const quantity = item.quantity || 0;
    const price = item.price || 0;
    const taxTreatment = item.taxTreatment || "EXEMPT_HEALTHCARE";
    const taxRate = item.taxRate || 0;

    return {
      id: field.id,
      description: item.description ?? "",
      quantity,
      unitPrice: price,
      taxTreatment,
      taxRate,
      hsnCode: item.hsnCode ?? "",
      sacCode: item.sacCode ?? "",
      total:
        quantity * price +
        (taxTreatment === "TAXABLE" ? (taxRate / 100) * quantity * price : 0),
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Line items</CardTitle>
      </CardHeader>
      <CardContent>
        <InvoiceItemsTable
          items={items}
          onUpdateItem={(index, key, value) => {
            const fieldName = key === "unitPrice" ? "price" : key;
            setValue(
              createInvoiceItemFieldPath(index, fieldName),
              value,
            );
            if (key === "taxTreatment" && value !== "TAXABLE") {
              setValue(
                createInvoiceItemFieldPath(index, "taxRate"),
                0,
              );
            }
          }}
          onRemoveItem={remove}
          formatCurrency={formatCurrency}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const newItem: InvoiceLineItemFormValues = {
              description: "",
              quantity: 1,
              price: 0,
              taxTreatment: "EXEMPT_HEALTHCARE",
              taxRate: 0,
            };
            append(newItem);
          }}
          className="mt-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>

        <InvoiceSubtotal
          control={control}
          totalAmount={totalAmount}
          formatCurrency={formatCurrency}
        />
      </CardContent>
    </Card>
  );
}

export function InvoiceCreateNotesSection({
  control,
}: {
  control: Control<CreateInvoiceFormValues>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
        <CardDescription>
          Add any additional notes or payment instructions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Notes"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
