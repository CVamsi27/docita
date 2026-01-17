"use client";

import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Textarea } from "@workspace/ui/components/textarea";
import { ArrowLeft, Loader2, Plus, Save } from "lucide-react";
import { useInvoiceCreateLogic } from "../hooks/use-invoice-create-logic";
import { InvoiceItemsTable } from "./sections/edit/InvoiceItemsTable";
import { InvoiceSubtotal } from "./sections/edit/InvoiceSubtotal";
import { PatientSelector } from "@/features/appointments/components/sections/add-dialog/PatientSelector";

export const InvoiceCreateUI: FC = () => {
  const {
    form,
    fields,
    append,
    remove,
    onSubmit,
    isSaving,
    totalAmount,
    router,
    // Patient selector props
    patients,
    patientsLoading,
    patientSearch,
    setPatientSearch,
    patientComboboxOpen,
    setPatientComboboxOpen,
  } = useInvoiceCreateLogic();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/invoices")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Invoice</h1>
          <p className="text-muted-foreground">
            Create a new invoice for a patient
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              {/* Patient Selector */}
              <div className="col-span-full md:col-span-1">
                <PatientSelector
                  form={form}
                  patients={patients}
                  patientsLoading={patientsLoading}
                  patientSearch={patientSearch}
                  setPatientSearch={setPatientSearch}
                  patientComboboxOpen={patientComboboxOpen}
                  setPatientComboboxOpen={setPatientComboboxOpen}
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
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
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
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceItemsTable
                items={fields.map((field, index) => ({
                  id: field.id,
                  description: form.watch(`items.${index}.description`),
                  quantity: form.watch(`items.${index}.quantity`) || 0,
                  unitPrice: form.watch(`items.${index}.price`) || 0,
                  total:
                    (form.watch(`items.${index}.quantity`) || 0) *
                    (form.watch(`items.${index}.price`) || 0),
                }))}
                onUpdateItem={(index, key, value) => {
                  const fieldName = key === "unitPrice" ? "price" : key;
                  form.setValue(
                    `items.${index}.${fieldName}` as import("react-hook-form").Path<
                      import("../hooks/use-invoice-create-logic").CreateInvoiceFormValues
                    >,
                    value
                  );
                }}
                onRemoveItem={remove}
                formatCurrency={formatCurrency}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ description: "", quantity: 1, price: 0 })
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
                        placeholder="Enter notes..."
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

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/invoices")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="min-w-[120px]">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
