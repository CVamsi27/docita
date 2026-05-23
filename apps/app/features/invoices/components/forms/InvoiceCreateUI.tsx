"use client";

import { FC } from "react";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Plus, Save } from "lucide-react";
import { useInvoiceCreateLogic } from "@/features/invoices/hooks/use-invoice-create-logic";
import { createInvoiceItemFieldPath } from "@/features/invoices/lib/invoice-form-paths";
import { BackButton } from "@/components/navigation/back-button";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceSubtotal } from "./InvoiceSubtotal";
import { PatientSelector } from "@/features/appointments";
import { formatCurrency } from "@workspace/utils";

export const InvoiceCreateUI: FC = () => {
  const {
    form,
    fields,
    append,
    remove,
    onSubmit,
    totalAmount,
    router,
    patients,
    patientsLoading,
    patientSearch,
    setPatientSearch,
    patientComboboxOpen,
    setPatientComboboxOpen,
  } = useInvoiceCreateLogic();

  return (
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <BackButton fallback="/invoices" label="Cancel" />
        <div>
          <h1 className="ui-page-title">New invoice</h1>
          <p className="text-muted-foreground">
            Create a new invoice for a patient
          </p>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Invoice details</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="col-span-full md:col-span-1">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
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
                control={form.control}
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line items</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceItemsTable
                items={fields.map((field, index) => ({
                  id: field.id,
                  description: form.watch(`items.${index}.description`),
                  quantity: form.watch(`items.${index}.quantity`) || 0,
                  unitPrice: form.watch(`items.${index}.price`) || 0,
                  taxTreatment:
                    form.watch(`items.${index}.taxTreatment`) ||
                    "EXEMPT_HEALTHCARE",
                  taxRate: form.watch(`items.${index}.taxRate`) || 0,
                  hsnCode: form.watch(`items.${index}.hsnCode`) || "",
                  sacCode: form.watch(`items.${index}.sacCode`) || "",
                  total:
                    (form.watch(`items.${index}.quantity`) || 0) *
                      (form.watch(`items.${index}.price`) || 0) +
                    ((form.watch(`items.${index}.taxTreatment`) === "TAXABLE"
                      ? form.watch(`items.${index}.taxRate`) || 0
                      : 0) /
                      100) *
                      ((form.watch(`items.${index}.quantity`) || 0) *
                        (form.watch(`items.${index}.price`) || 0)),
                }))}
                onUpdateItem={(index, key, value) => {
                  const fieldName = key === "unitPrice" ? "price" : key;
                  form.setValue(
                    createInvoiceItemFieldPath(index, fieldName),
                    value,
                  );
                  if (key === "taxTreatment" && value !== "TAXABLE") {
                    form.setValue(
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
                onClick={() =>
                  append({
                    description: "",
                    quantity: 1,
                    price: 0,
                    taxTreatment: "EXEMPT_HEALTHCARE",
                    taxRate: 0,
                  })
                }
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>

              <InvoiceSubtotal
                control={form.control}
                totalAmount={totalAmount}
                formatCurrency={formatCurrency}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>
                Add any additional notes or payment instructions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
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

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/invoices")}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Save Invoice
            </Button>
          </div>
        </form>
      </Form>
    </div>
    </FeatureGate>
  );
};
