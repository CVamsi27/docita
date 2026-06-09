// check-as-cast-density: allow-file — React Hook Form generic field names require as Path<T>
"use client";

// jscpd:ignore-start
import type { ComponentProps } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { DatePicker } from "@workspace/ui/components/form/date-picker";
import { Input } from "@workspace/ui/components/form/input";
import {
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
import { GENDER_OPTIONS } from "./add-patient-dialog-constants";

interface SharedPatientInfoFieldsProps<T extends FieldValues> {
  control: Control<T>;
// jscpd:ignore-end
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

/**
 * One labelled text `FormField` bound to `Input`. `SharedPatientNameFields`
 * and `SharedPatientContactFields` below are both lists of these — same
 * label/control/message shell, differing only in field name, copy, and a
 * couple of native input attributes — so each renders its config list through
 * this single component instead of repeating the `FormField` markup per field.
 */
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

const PATIENT_NAME_FIELDS: PatientTextFieldConfig[] = [
  {
    name: "firstName",
    label: "First Name",
    placeholder: "First name",
    required: true,
  },
  {
    name: "lastName",
    label: "Last Name",
    placeholder: "Last name",
    required: true,
  },
];

const PATIENT_CONTACT_FIELDS: PatientTextFieldConfig[] = [
  {
    name: "phoneNumber",
    label: "Phone",
    placeholder: "Phone number",
    inputProps: { inputMode: "tel" },
  },
  {
    name: "email",
    label: "Email",
    placeholder: "Email",
    inputProps: { type: "email" },
  },
];

export function SharedPatientNameFields<T extends FieldValues>({
  control,
}: SharedPatientInfoFieldsProps<T>) {
  return (
    <>
      {PATIENT_NAME_FIELDS.map((config) => (
        <PatientTextField key={config.name} control={control} config={config} />
      ))}
    </>
  );
}

export function SharedPatientContactFields<T extends FieldValues>({
  control,
}: SharedPatientInfoFieldsProps<T>) {
  return (
    <>
      {PATIENT_CONTACT_FIELDS.map((config) => (
        <PatientTextField key={config.name} control={control} config={config} />
      ))}
    </>
  );
}

export function SharedPatientIdentityFields<T extends FieldValues>({
  control,
  genderRequired,
  dateOfBirthRequired,
}: SharedPatientInfoFieldsProps<T>) {
  return (
    <>
      <FormField control={control} name={"gender" as Path<T>} render={({ field }) => (
        <FormItem>
          <FormLabel>Gender {genderRequired ? <span className="text-destructive ml-0.5">*</span> : null}</FormLabel>
          <Select
            value={field.value ?? ""}
            onValueChange={(value) => {
              const match = GENDER_OPTIONS.find((o) => o.value === value);
              if (match) field.onChange(match.value);
            }}
          >
            <FormControl><SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger></FormControl>
            <SelectContent>
              {GENDER_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name={"dateOfBirth" as Path<T>} render={({ field }) => (
        <FormItem>
          <FormLabel>Date of Birth {dateOfBirthRequired ? <span className="text-destructive ml-0.5">*</span> : null}</FormLabel>
          <FormControl>
            <DatePicker value={field.value || undefined} onChange={(date) => field.onChange(date?.toISOString().slice(0, 10) ?? "")} placeholder="Date of birth" maxDate={new Date()} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </>
  );
}
