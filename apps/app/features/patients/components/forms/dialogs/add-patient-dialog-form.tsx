"use client";

import type { BaseSyntheticEvent } from "react";
import type { Control, UseFormReturn } from "react-hook-form";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button } from "@workspace/ui/components/form/button";
import { Checkbox } from "@workspace/ui/components/form/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import {
  DPDP_NOTICE_TEXT_STAFF,
  DPDP_NOTICE_TITLE,
  DPDP_NOTICE_VERSION,
  type PatientCreateFormValues,
} from "@workspace/types";
import {
  SharedPatientContactFields,
  SharedPatientIdentityFields,
  SharedPatientNameFields,
} from "./shared-patient-info-fields";
import {
  AbhaVerificationField,
  type AbhaVerificationUiState,
} from "./abha-verification-field";

function DpdpConsentSection({
  control,
}: {
  control: Control<PatientCreateFormValues>;
}) {
  return (
    <FormField
      control={control}
      name="dpdpConsent"
      render={({ field, fieldState }) => (
        <FormItem className="rounded-md border border-border/70 bg-muted/30 p-4">
          <FormLabel className="text-sm font-semibold">
            {DPDP_NOTICE_TITLE}
          </FormLabel>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {DPDP_NOTICE_TEXT_STAFF}
          </p>
          <FormControl>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox
                checked={field.value?.accepted === true}
                onCheckedChange={(checked) => {
                  field.onChange(
                    checked === true
                      ? {
                          accepted: true,
                          noticeVersion: DPDP_NOTICE_VERSION,
                          relation: "SELF",
                        }
                      : undefined,
                  );
                }}
                aria-invalid={fieldState.error ? true : undefined}
              />
              <span>
                I confirm DPDP Act, 2023 consent has been obtained from the
                patient (or their authorised representative).
                <span className="text-destructive ml-0.5">*</span>
              </span>
            </label>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function FormFooter({
  isPending,
  dpdpAccepted,
  onCancel,
  patientCreated,
}: {
  isPending: boolean;
  dpdpAccepted: boolean;
  onCancel: () => void;
  patientCreated: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isPending}
      >
        {patientCreated ? "Close" : "Cancel"}
      </Button>
      {!patientCreated ? (
        <Button type="submit" disabled={isPending || !dpdpAccepted}>
          {isPending && (
            <DocitaLoadingIndicator
              variant="inline"
              decorative
              className="mr-2"
            />
          )}
          Add Patient
        </Button>
      ) : null}
    </div>
  );
}

export function AddPatientDialogForm({
  form,
  dpdpAccepted,
  isPending,
  abhaAddress,
  abhaStatus,
  createdPatientId,
  onVerifyAbha,
  onSubmit,
  onCancel,
}: {
  form: UseFormReturn<PatientCreateFormValues>;
  dpdpAccepted: boolean;
  isPending: boolean;
  abhaAddress?: string | null;
  abhaStatus: AbhaVerificationUiState;
  createdPatientId?: string | null;
  onVerifyAbha: () => void;
  onSubmit: (e?: BaseSyntheticEvent) => void;
  onCancel: () => void;
}) {
  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SharedPatientNameFields control={form.control} />
          <SharedPatientContactFields control={form.control} />
          <AbhaVerificationField
            control={form.control}
            name="abhaAddress"
            currentValue={abhaAddress}
            isPending={isPending}
            patientId={createdPatientId}
            status={abhaStatus}
            onVerify={onVerifyAbha}
          />
          <SharedPatientIdentityFields
            control={form.control}
            genderRequired
            dateOfBirthRequired
          />
        </div>
        <DpdpConsentSection control={form.control} />
        <FormFooter
          isPending={isPending}
          dpdpAccepted={dpdpAccepted}
          onCancel={onCancel}
          patientCreated={Boolean(createdPatientId)}
        />
      </form>
    </Form>
  );
}
