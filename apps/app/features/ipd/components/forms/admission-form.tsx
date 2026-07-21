"use client";

// jscpd:ignore-start
import { FC } from "react";
import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { ipdAdmissionFormSchema, type IpdAdmissionFormValues } from "@workspace/types";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@workspace/ui/components/form/form-primitives";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Form } from "@workspace/ui/components";

export type AdmissionFormData = IpdAdmissionFormValues;
// jscpd:ignore-end
export { ipdAdmissionFormSchema };

export interface AdmissionFormProps {
  defaultValues?: Partial<IpdAdmissionFormValues>;
  onSubmit?: (data: IpdAdmissionFormValues) => void;
  isSubmitting?: boolean;
}

const WARD_OPTIONS = [
  { value: "general", label: "General Ward" },
  { value: "icu", label: "ICU" },
  { value: "private", label: "Private Room" },
];

const BED_OPTIONS = [
  { value: "bed-1", label: "Bed 101" },
  { value: "bed-2", label: "Bed 102" },
  { value: "bed-3", label: "Bed 103" },
];

const DOCTOR_OPTIONS = [
  { value: "dr1", label: "Dr. Vamsi Krishna" },
  { value: "dr2", label: "Dr. Priya Sharma" },
];

interface AdmissionSelectFieldOption {
  value: string;
  label: string;
}

interface AdmissionSelectFieldProps {
  control: Control<IpdAdmissionFormValues>;
  name: "wardId" | "bedId" | "attendingDoctorId";
  label: string;
  ariaLabel: string;
  placeholder: string;
  options: AdmissionSelectFieldOption[];
}

/**
 * Ward, bed, and attending-doctor all render the same "labeled select with
 * options drawn from a static list" `FormField` shape — only the bound field,
 * copy, and option list differ — so that shape lives here once.
 */
const AdmissionSelectField: FC<AdmissionSelectFieldProps> = ({
  control,
  name,
  label,
  ariaLabel,
  placeholder,
  options,
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Select onValueChange={field.onChange} value={field.value}>
          <FormControl>
            <SelectTrigger className="w-full" aria-label={ariaLabel}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
);

/**
 * Phase 3 (per-feature): apps/app IPD > admission form.
 * 5 literals converted to useTranslations("Ipd.admissionForm").
 */
function useAdmissionFormTranslations() {
  return useTranslations("Ipd.admissionForm");
}

export const AdmissionForm: FC<AdmissionFormProps> = ({
  defaultValues,
  onSubmit,
  isSubmitting,
}) => {
  const t = useAdmissionFormTranslations();
  const form = useForm<IpdAdmissionFormValues>({
    resolver: zodResolver(ipdAdmissionFormSchema),
    defaultValues: {
      patientId: defaultValues?.patientId ?? "",
      wardId: defaultValues?.wardId ?? "",
      bedId: defaultValues?.bedId ?? "",
      attendingDoctorId: defaultValues?.attendingDoctorId ?? "",
      diagnosis: defaultValues?.diagnosis ?? "",
      notes: defaultValues?.notes ?? "",
    },
    mode: "onTouched",
  });

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit?.(values);
  });

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("patientLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("patientPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <AdmissionSelectField
                control={form.control}
                name="wardId"
                label={t("wardLabel")}
                ariaLabel={t("wardAriaLabel")}
                placeholder={t("wardPlaceholder")}
                options={WARD_OPTIONS}
              />

              <AdmissionSelectField
                control={form.control}
                name="bedId"
                label={t("bedLabel")}
                ariaLabel={t("bedAriaLabel")}
                placeholder={t("bedPlaceholder")}
                options={BED_OPTIONS}
              />
            </div>

            <AdmissionSelectField
              control={form.control}
              name="attendingDoctorId"
              label={t("doctorLabel")}
              ariaLabel={t("doctorAriaLabel")}
              placeholder={t("doctorPlaceholder")}
              options={DOCTOR_OPTIONS}
            />

            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("diagnosisLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("diagnosisPlaceholder")}
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("notesLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("notesPlaceholder")}
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || form.formState.isSubmitting}
            >
              {isSubmitting || form.formState.isSubmitting
                ? t("submittingButton")
                : t("submitButton")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
