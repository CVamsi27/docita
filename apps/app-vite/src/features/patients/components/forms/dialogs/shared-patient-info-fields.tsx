// check-as-cast-density: allow-file — react-hook-form Path<T> generics require as-casts
import { useTranslation } from "react-i18next";
import type { ComponentProps } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";
import { DatePicker } from "@workspace/ui/components";
import { GENDER_OPTIONS } from "./add-patient-dialog-constants";

interface SharedPatientInfoFieldsProps<T extends FieldValues> {
  control: Control<T>;
  dateOfBirthRequired?: boolean;
  genderRequired?: boolean;
}

interface PatientTextFieldConfig {
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
  inputProps?: Pick<ComponentProps<"input">, "type" | "inputMode">;
}

function PatientTextField<T extends FieldValues>({
  control,
  config,
}: {
  control: Control<T>;
  config: PatientTextFieldConfig;
}) {
  return (
    <FormField
      control={control}
      name={config.name as Path<T>}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {config.label}
            {config.required ? (
              <span className="text-destructive ml-0.5"> *</span>
            ) : null}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ""}
              placeholder={config.placeholder}
              {...config.inputProps}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function PatientTextFieldList<T extends FieldValues>({
  control,
  configs,
}: {
  control: Control<T>;
  configs: PatientTextFieldConfig[];
}) {
  return (
    <>
      {configs.map((config) => (
        <PatientTextField key={config.name} control={control} config={config} />
      ))}
    </>
  );
}

export function SharedPatientNameFields<T extends FieldValues>({
  control,
}: SharedPatientInfoFieldsProps<T>) {
  const { t } = useTranslation("Patients.patientForm");
  const configs: PatientTextFieldConfig[] = [
    {
      name: "firstName",
      label: t("firstNameLabel"),
      placeholder: t("firstNamePlaceholder"),
      required: true,
    },
    {
      name: "lastName",
      label: t("lastNameLabel"),
      placeholder: t("lastNamePlaceholder"),
      required: true,
    },
  ];
  return <PatientTextFieldList control={control} configs={configs} />;
}

export function SharedPatientContactFields<T extends FieldValues>({
  control,
}: SharedPatientInfoFieldsProps<T>) {
  const { t } = useTranslation("Patients.patientForm");
  const configs: PatientTextFieldConfig[] = [
    {
      name: "phoneNumber",
      label: t("phoneLabel"),
      placeholder: t("phonePlaceholder"),
      inputProps: { inputMode: "tel" },
    },
    {
      name: "email",
      label: t("emailLabel"),
      placeholder: t("emailPlaceholder"),
      inputProps: { type: "email" },
    },
  ];
  return <PatientTextFieldList control={control} configs={configs} />;
}

export function SharedPatientIdentityFields<T extends FieldValues>({
  control,
  genderRequired,
  dateOfBirthRequired,
}: SharedPatientInfoFieldsProps<T>) {
  const { t } = useTranslation("Patients.patientForm");
  return (
    <>
      <FormField
        control={control}
        name={"gender" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("genderLabel")}{" "}
              {genderRequired ? (
                <span className="text-destructive ml-0.5">*</span>
              ) : null}
            </FormLabel>
            <Select
              value={field.value ?? ""}
              onValueChange={(value) => {
                const match = GENDER_OPTIONS.find((o) => o.value === value);
                if (match) field.onChange(match.value);
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t("genderPlaceholder")} />
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
        control={control}
        name={"dateOfBirth" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("dateOfBirthLabel")}{" "}
              {dateOfBirthRequired ? (
                <span className="text-destructive ml-0.5">*</span>
              ) : null}
            </FormLabel>
            <FormControl>
              <DatePicker
                value={field.value || undefined}
                onChange={(date) =>
                  field.onChange(date?.toISOString().slice(0, 10) ?? "")
                }
                placeholder={t("dateOfBirthPlaceholder")}
                maxDate={new Date()}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
