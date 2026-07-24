"use client";

import type { Control } from "react-hook-form";
import type { CreateInvoiceFormValues, Patient } from "@workspace/types";
import { FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form/form";
import { PatientSelector } from "@/features/appointments";
import { InvoiceDetailsCard, InvoiceStatusField } from "./invoice-form-sections-shared";

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
    <InvoiceDetailsCard>
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

      <InvoiceStatusField control={control} />
    </InvoiceDetailsCard>
  );
}
