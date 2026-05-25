"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import React, { FC } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Patient } from "@workspace/types";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useUpdatePatient } from "@workspace/data-access";
import { Button } from "@workspace/ui/components/form/button";
import { DatePicker } from "@workspace/ui/components/form/date-picker";
import { FormDialog } from "@workspace/ui/components/form/form-dialog";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { Input } from "@workspace/ui/components/form/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { updatePatientRequestSchema } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";
import { validatePatientPhoneNumberForCountry } from "@/features/patients/rules/patientRules";

interface EditPatientDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  patient?: Patient | null;
  onPatientUpdated?: () => void;
}

type GenderValue =
  | "MALE"
  | "FEMALE"
  | "OTHER"
  | "INTERSEX"
  | "NON_BINARY"
  | "PREFER_NOT_TO_SAY";

const GENDER_VALUES = [
  "MALE",
  "FEMALE",
  "OTHER",
  "INTERSEX",
  "NON_BINARY",
  "PREFER_NOT_TO_SAY",
] as const satisfies readonly GenderValue[];

const GENDER_OPTIONS: { value: GenderValue; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "INTERSEX", label: "Intersex" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

export const EditPatientDialog: FC<EditPatientDialogProps> = ({
  open = false,
  onOpenChange,
  patient,
  onPatientUpdated,
}) => {
  const updatePatient = useUpdatePatient(patient?.id ?? "");
  const { clinic } = useClinic();
  type PatientUpdateFormValues = z.infer<typeof updatePatientRequestSchema>;

  const form = useForm<PatientUpdateFormValues>({
    resolver: zodResolver(updatePatientRequestSchema),
    values: patient
      ? {
          firstName: patient.firstName ?? "",
          lastName: patient.lastName ?? "",
          phoneNumber: patient.phoneNumber ?? null,
          email: patient.email ?? null,
          gender:
            parseStringEnumMember(GENDER_VALUES, patient.gender ?? "MALE") ??
            "MALE",
          dateOfBirth: patient.dateOfBirth
            ? String(patient.dateOfBirth).split("T")[0]
            : null,
          address:
            typeof patient.address === "string" ? patient.address : null,
          mrn: patient.mrn ?? null,
          metadata: null,
          clinicId: undefined,
        }
      : undefined,
  });

  const handleInvalidSubmit = () => {
    showUserFacingErrorToast(
      "Please check the highlighted fields and try again.",
      "Please check the highlighted fields and try again.",
      "form",
    );
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!patient) return;
    try {
      const phoneError = validatePatientPhoneNumberForCountry(
        values.phoneNumber,
        clinic?.countryCode,
      );
      if (phoneError) {
        form.setError("phoneNumber", {
          type: "manual",
          message: phoneError,
        });
        showUserFacingErrorToast(
          "Please check the highlighted fields and try again.",
          "Please check the highlighted fields and try again.",
          "form",
        );
        return;
      }

      await updatePatient.mutateAsync(
        updatePatientRequestSchema.parse({
          ...values,
          firstName: values.firstName?.trim() || undefined,
          lastName: values.lastName?.trim() || undefined,
          gender: values.gender || undefined,
          phoneNumber: values.phoneNumber?.trim() || undefined,
          email: values.email?.trim() || undefined,
          dateOfBirth: values.dateOfBirth || undefined,
        }),
      );
      toast.success("Patient updated successfully");
      onPatientUpdated?.();
      onOpenChange?.(false);
    } catch {
      showUserFacingErrorToast(
        "We could not save this patient. Please try again.",
      );
    }
  }, handleInvalidSubmit);

  if (!patient) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => onOpenChange?.(o)}
      title="Edit Patient"
      description="Update the patient's information"
    >
      <Form {...form}>
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    First Name{" "}
                    <span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="First name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Last Name <span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Last name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Phone number"
                      inputMode="tel"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type="email"
                      placeholder="Email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Gender <span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(value) => {
                      const parsed = parseStringEnumMember(GENDER_VALUES, value);
                      if (parsed) {
                        field.onChange(parsed);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENDER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value || undefined}
                      onChange={(date) =>
                        field.onChange(date?.toISOString().slice(0, 10) ?? "")
                      }
                      placeholder="Date of birth"
                      maxDate={new Date()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={updatePatient.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updatePatient.isPending}>
              {updatePatient.isPending && (
                <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
};
