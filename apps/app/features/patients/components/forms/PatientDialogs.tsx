"use client";

import React, { FC, ReactNode } from "react";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Patient } from "@workspace/types";
import { useCreatePatient, useUpdatePatient } from "@/hooks/api/use-patients";
import { Button } from "@workspace/ui/components/button";
import { FormDialog } from "@workspace/ui/components/form-dialog";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  createPatientRequestSchema,
  updatePatientRequestSchema,
} from "@workspace/types";

interface AddPatientDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPatientAdded?: () => void;
}

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

const GENDER_OPTIONS: { value: GenderValue; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "INTERSEX", label: "Intersex" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

function FormField({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}{required && " *"}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export const AddPatientDialog: FC<AddPatientDialogProps> = ({
  open = false,
  onOpenChange,
  onPatientAdded,
}) => {
  const createPatient = useCreatePatient();

  const todayStr = new Date().toISOString().slice(0, 10);
  const patientCreateFormSchema = createPatientRequestSchema.superRefine(
    (val, ctx) => {
      if (!val.dateOfBirth) return;
      const dob = new Date(val.dateOfBirth as string | Date);
      if (Number.isNaN(dob.getTime())) return;
      if (dob.getTime() > Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dateOfBirth"],
          message: "Date of birth must not be in the future",
        });
      }
    },
  );

  type PatientCreateFormValues = z.infer<typeof patientCreateFormSchema>;

  const form = useForm<PatientCreateFormValues>({
    resolver: zodResolver(patientCreateFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: null,
      email: null,
      gender: "MALE",
      dateOfBirth: null,
      address: null,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await form.trigger();
    if (!isValid) return;
    try {
      const values = form.getValues();
      await createPatient.mutateAsync(
        createPatientRequestSchema.parse({
          ...values,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          phoneNumber: values.phoneNumber?.trim() || undefined,
          email: values.email?.trim() || undefined,
          dateOfBirth: values.dateOfBirth || undefined,
        }),
      );
      toast.success("Patient added successfully");
      form.reset();
      onPatientAdded?.();
      onOpenChange?.(false);
    } catch {
      showUserFacingErrorToast(
        "We could not add this patient. Please try again.",
      );
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange?.(open);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleClose}
      title="Add New Patient"
      description="Enter the patient's details to create their record"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            id="patient-first-name"
            label="First Name"
            required
            error={form.formState.errors.firstName?.message}
          >
            <input
              id="patient-first-name"
              className={inputClass}
              {...form.register("firstName")}
              placeholder="First name"
            />
          </FormField>

          <FormField
            id="patient-last-name"
            label="Last Name"
            required
            error={form.formState.errors.lastName?.message}
          >
            <input
              id="patient-last-name"
              className={inputClass}
              {...form.register("lastName")}
              placeholder="Last name"
            />
          </FormField>

          <FormField id="patient-phone" label="Phone">
            <input
              id="patient-phone"
              className={inputClass}
              {...form.register("phoneNumber")}
              placeholder="+91 99999 99999"
            />
          </FormField>

          <FormField id="patient-email" label="Email">
            <input
              id="patient-email"
              className={inputClass}
              type="email"
              {...form.register("email")}
              placeholder="patient@example.com"
            />
          </FormField>

          <FormField
            id="patient-gender"
            label="Gender"
            required
            error={form.formState.errors.gender?.message}
          >
            <select
              id="patient-gender"
              className={inputClass}
              {...form.register("gender")}
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="patient-dob"
            label="Date of Birth"
            error={form.formState.errors.dateOfBirth?.message}
          >
            <input
              id="patient-dob"
              className={inputClass}
              type="date"
              max={todayStr}
              {...form.register("dateOfBirth")}
            />
          </FormField>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={createPatient.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createPatient.isPending}>
            {createPatient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Patient
          </Button>
        </div>
      </form>
    </FormDialog>
  );
};

export const EditPatientDialog: FC<EditPatientDialogProps> = ({
  open = false,
  onOpenChange,
  patient,
  onPatientUpdated,
}) => {
  const updatePatient = useUpdatePatient(patient?.id ?? "");
  const todayStr = new Date().toISOString().slice(0, 10);

  const patientUpdateFormSchema = updatePatientRequestSchema.superRefine(
    (val, ctx) => {
      if (!val.dateOfBirth) return;
      const dob = new Date(val.dateOfBirth as string | Date);
      if (Number.isNaN(dob.getTime())) return;
      if (dob.getTime() > Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dateOfBirth"],
          message: "Date of birth must not be in the future",
        });
      }
    },
  );

  type PatientUpdateFormValues = z.infer<typeof patientUpdateFormSchema>;

  const form = useForm<PatientUpdateFormValues>({
    resolver: zodResolver(patientUpdateFormSchema),
    values: patient
      ? {
          firstName: patient.firstName ?? "",
          lastName: patient.lastName ?? "",
          phoneNumber: patient.phoneNumber ?? null,
          email: patient.email ?? null,
          gender: (patient.gender ?? "MALE") as GenderValue,
          dateOfBirth: patient.dateOfBirth
            ? String(patient.dateOfBirth).split("T")[0]
            : null,
          address: (patient.address as string | undefined) ?? null,
          mrn: patient.mrn ?? null,
          metadata: null,
          clinicId: undefined,
        }
      : undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    const isValid = await form.trigger();
    if (!isValid) return;
    try {
      const values = form.getValues();
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
  };

  if (!patient) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => onOpenChange?.(o)}
      title="Edit Patient"
      description="Update the patient's information"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField id="edit-first-name" label="First Name">
            <input
              id="edit-first-name"
              className={inputClass}
              {...form.register("firstName")}
              placeholder="First name"
            />
          </FormField>
          <FormField id="edit-last-name" label="Last Name">
            <input
              id="edit-last-name"
              className={inputClass}
              {...form.register("lastName")}
              placeholder="Last name"
            />
          </FormField>
          <FormField id="edit-phone" label="Phone">
            <input
              id="edit-phone"
              className={inputClass}
              {...form.register("phoneNumber")}
              placeholder="+91 99999 99999"
            />
          </FormField>
          <FormField id="edit-email" label="Email">
            <input
              id="edit-email"
              className={inputClass}
              type="email"
              {...form.register("email")}
              placeholder="patient@example.com"
            />
          </FormField>
          <FormField id="edit-gender" label="Gender">
            <select id="edit-gender" className={inputClass} {...form.register("gender")}>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </FormField>
          <FormField id="edit-dob" label="Date of Birth">
            <input
              id="edit-dob"
              className={inputClass}
              type="date"
              max={todayStr}
              {...form.register("dateOfBirth")}
            />
          </FormField>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} disabled={updatePatient.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={updatePatient.isPending}>
            {updatePatient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </FormDialog>
  );
};

interface PatientFormDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export const PatientFormDialog: FC<PatientFormDialogProps> = ({ children }) => {
  return <>{children}</>;
};

interface FhirExportDialogProps {
  children?: ReactNode;
  patientId?: string;
  patientName?: string;
}

export const FhirExportDialog: FC<FhirExportDialogProps> = ({ children }) => {
  return (
    <>
      {children ?? (
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export FHIR
        </Button>
      )}
    </>
  );
};
