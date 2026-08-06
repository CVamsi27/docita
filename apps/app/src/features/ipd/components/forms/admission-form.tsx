import { FC } from "react";
import { useTranslation } from "react-i18next";
import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ipdAdmissionFormSchema,
  type IpdAdmissionFormValues,
} from "@workspace/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
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
} from "@workspace/ui/components/form/select";export type AdmissionFormData = IpdAdmissionFormValues;
export interface AdmissionFormProps {
  defaultValues?: Partial<IpdAdmissionFormValues>;
  onSubmit?: (data: IpdAdmissionFormValues) => void;
  isSubmitting?: boolean;
}


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

function wardOptions(t: (key: string) => string): AdmissionSelectFieldOption[] {
  return [
    { value: "general", label: t("optionGeneralWard") },
    { value: "icu", label: t("optionIcu") },
    { value: "private", label: t("optionPrivateRoom") },
  ];
}

function bedOptions(t: (key: string) => string): AdmissionSelectFieldOption[] {
  return [
    { value: "bed-1", label: t("optionBed101") },
    { value: "bed-2", label: t("optionBed102") },
    { value: "bed-3", label: t("optionBed103") },
  ];
}

export const AdmissionForm: FC<AdmissionFormProps> = ({
  defaultValues,
  onSubmit,
  isSubmitting,
}) => {
  const { t } = useTranslation("Ipd.admissionForm");
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

  const handleSubmit = form.handleSubmit((values: IpdAdmissionFormValues) => {
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
                  <FormLabel>{t("patientIdLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("patientIdPlaceholder")}
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
                ariaLabel={t("selectWard")}
                placeholder={t("selectWard")}
                options={wardOptions(t)}
              />

              <AdmissionSelectField
                control={form.control}
                name="bedId"
                label={t("bedLabel")}
                ariaLabel={t("selectBed")}
                placeholder={t("selectBed")}
                options={bedOptions(t)}
              />
            </div>

            <AdmissionSelectField
              control={form.control}
              name="attendingDoctorId"
              label={t("attendingDoctorLabel")}
              ariaLabel={t("selectDoctor")}
              placeholder={t("selectDoctor")}
              options={[
                { value: "dr1", label: "Dr. Vamsi Krishna" },
                { value: "dr2", label: "Dr. Priya Sharma" },
              ]}
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
                ? t("admitting")
                : t("admitPatient")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
