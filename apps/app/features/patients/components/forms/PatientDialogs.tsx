"use client";

import React, { FC, ReactNode, useState } from "react";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";

import { Patient } from "@workspace/types";
import { useCreatePatient, useUpdatePatient } from "@/hooks/api/use-patients";
import { Button } from "@workspace/ui/components/button";
import { FormDialog } from "@workspace/ui/components/form-dialog";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

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

type GenderValue = "" | "MALE" | "FEMALE" | "OTHER" | "INTERSEX" | "NON_BINARY";

const GENDER_OPTIONS: { value: Exclude<GenderValue, "">; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "INTERSEX", label: "Intersex" },
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
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    gender: "" as GenderValue,
    dateOfBirth: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createPatient = useCreatePatient();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Enter the patient's first name";
    if (!form.lastName.trim()) e.lastName = "Enter the patient's last name";
    if (!form.gender) e.gender = "Choose a gender";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      await createPatient.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender as Exclude<GenderValue, "">,
        phoneNumber: form.phoneNumber.trim() || undefined,
        email: form.email.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
      });
      toast.success("Patient added successfully");
      setForm({ firstName: "", lastName: "", phoneNumber: "", email: "", gender: "", dateOfBirth: "" });
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
      setForm({ firstName: "", lastName: "", phoneNumber: "", email: "", gender: "", dateOfBirth: "" });
      setErrors({});
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
          <FormField id="patient-first-name" label="First Name" required error={errors.firstName}>
            <input
              id="patient-first-name"
              className={inputClass}
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="First name"
            />
          </FormField>

          <FormField id="patient-last-name" label="Last Name" required error={errors.lastName}>
            <input
              id="patient-last-name"
              className={inputClass}
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Last name"
            />
          </FormField>

          <FormField id="patient-phone" label="Phone">
            <input
              id="patient-phone"
              className={inputClass}
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              placeholder="+91 99999 99999"
            />
          </FormField>

          <FormField id="patient-email" label="Email">
            <input
              id="patient-email"
              className={inputClass}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="patient@example.com"
            />
          </FormField>

          <FormField id="patient-gender" label="Gender" required error={errors.gender}>
            <select
              id="patient-gender"
              className={inputClass}
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as GenderValue })}
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="patient-dob" label="Date of Birth">
            <input
              id="patient-dob"
              className={inputClass}
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
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
  const [form, setForm] = useState({
    firstName: patient?.firstName ?? "",
    lastName: patient?.lastName ?? "",
    phoneNumber: patient?.phoneNumber ?? "",
    email: patient?.email ?? "",
    gender: (patient?.gender ?? "") as GenderValue,
    dateOfBirth: patient?.dateOfBirth ? String(patient.dateOfBirth).split("T")[0] : "",
  });

  React.useEffect(() => {
    if (patient) {
      setForm({
        firstName: patient.firstName ?? "",
        lastName: patient.lastName ?? "",
        phoneNumber: patient.phoneNumber ?? "",
        email: patient.email ?? "",
        gender: (patient.gender ?? "") as GenderValue,
        dateOfBirth: patient.dateOfBirth ? String(patient.dateOfBirth).split("T")[0] : "",
      });
    }
  }, [patient]);

  const updatePatient = useUpdatePatient(patient?.id ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    try {
      await updatePatient.mutateAsync({
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        gender: (form.gender as Exclude<GenderValue, "">) || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        email: form.email.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
      });
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
            <input id="edit-first-name" className={inputClass} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="First name" />
          </FormField>
          <FormField id="edit-last-name" label="Last Name">
            <input id="edit-last-name" className={inputClass} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" />
          </FormField>
          <FormField id="edit-phone" label="Phone">
            <input id="edit-phone" className={inputClass} value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="+91 99999 99999" />
          </FormField>
          <FormField id="edit-email" label="Email">
            <input id="edit-email" className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="patient@example.com" />
          </FormField>
          <FormField id="edit-gender" label="Gender">
            <select id="edit-gender" className={inputClass} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as GenderValue })}>
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </FormField>
          <FormField id="edit-dob" label="Date of Birth">
            <input id="edit-dob" className={inputClass} type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
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
