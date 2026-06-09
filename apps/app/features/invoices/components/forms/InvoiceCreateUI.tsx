"use client";

import { FC } from "react";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { Button } from "@workspace/ui/components/form/button";
import {
  Form,
} from "@workspace/ui/components/form/form";
import { Save } from "lucide-react";
import { useInvoiceCreateLogic } from "@/features/invoices/hooks/use-invoice-create-logic";
import { BackButton } from "@/components/navigation/back-button";
import { createInvoiceItemFieldPath } from "@/features/invoices/lib/invoice-form-paths";
import { InvoiceCreateDetailsSection } from "./InvoiceCreateUISections";
import {
  InvoiceLineItemsSectionContainer,
  InvoiceNotesSection,
} from "./invoice-form-sections-shared";

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
          <InvoiceCreateDetailsSection
            control={form.control}
            patients={patients}
            patientsLoading={patientsLoading}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            patientComboboxOpen={patientComboboxOpen}
            setPatientComboboxOpen={setPatientComboboxOpen}
          />

          <InvoiceLineItemsSectionContainer
            control={form.control}
            setValue={form.setValue}
            fields={fields}
            append={append}
            remove={remove}
            totalAmount={totalAmount}
            buildFieldPath={createInvoiceItemFieldPath}
          />

          <InvoiceNotesSection control={form.control} />

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
