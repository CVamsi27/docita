"use client";

import React, { FC, ReactNode } from "react";
import { Download } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { DatePicker } from "@workspace/ui/components/date-picker";
import { FormDialog } from "@workspace/ui/components/form-dialog";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { Input } from "@workspace/ui/components/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  createPatientRequestSchema,
  DPDP_NOTICE_TEXT_STAFF,
  DPDP_NOTICE_TITLE,
  DPDP_NOTICE_VERSION,
  updatePatientRequestSchema,
} from "@workspace/types";
import { validatePatientPhoneNumberForCountry } from "@/features/patients/rules/patientRules";

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

export const AddPatientDialog: FC<AddPatientDialogProps> = ({
  open = false,
  onOpenChange,
  onPatientAdded,
}) => {
  const createPatient = useCreatePatient();
  const { clinic } = useClinic();

  const patientCreateFormSchema = createPatientRequestSchema.superRefine(
    (val, ctx) => {
      if (!val.dateOfBirth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dateOfBirth"],
          message: "Date of birth is required",
        });
      }
      if (val.dpdpConsent?.accepted !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dpdpConsent", "accepted"],
          message:
            "Confirm DPDP consent has been obtained from the patient before saving",
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
      dateOfBirth: "",
      address: null,
      dpdpConsent: undefined,
    },
  });

  const dpdpAccepted = form.watch("dpdpConsent")?.accepted === true;

  const handleInvalidSubmit = () => {
    showUserFacingErrorToast(
      "Please check the highlighted fields and try again.",
      "Please check the highlighted fields and try again.",
      "form",
    );
  };

  const handleSubmit = form.handleSubmit(async (values) => {
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
  }, handleInvalidSubmit);

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
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange(value as GenderValue)
                    }
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
                  <FormLabel>
                    Date of Birth{" "}
                    <span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
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

          <FormField
            control={form.control}
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
                      I confirm DPDP Act, 2023 consent has been obtained from
                      the patient (or their authorised representative).
                      <span className="text-destructive ml-0.5">*</span>
                    </span>
                  </label>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={createPatient.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPatient.isPending || !dpdpAccepted}
            >
              {createPatient.isPending && (
                <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
              )}
              Add Patient
            </Button>
          </div>
        </form>
      </Form>
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
                    onValueChange={(value) =>
                      field.onChange(value as GenderValue)
                    }
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
