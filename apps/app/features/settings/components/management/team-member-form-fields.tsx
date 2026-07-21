// check-as-cast-density: allow-file — React Hook Form generic field names require as Path<TFormValues>
"use client";

import type { FieldValues, UseFormReturn, Path } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";
import { useLabs } from "@workspace/data-access";

const LAB_UNASSIGNED_VALUE = "__unassigned__";

export function TeamMemberContactFields<TFormValues extends FieldValues>({
  form,
}: {
  form: UseFormReturn<TFormValues>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name={"email" as Path<TFormValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="Email" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={"phoneNumber" as Path<TFormValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone (optional)</FormLabel>
            <FormControl>
              <Input placeholder="Phone number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

interface TeamMemberLabFieldProps<TFormValues extends FieldValues> {
  form: UseFormReturn<TFormValues>;
}

export function TeamMemberLabField<TFormValues extends FieldValues>({
  form,
}: TeamMemberLabFieldProps<TFormValues>) {
  const { data: labs = [] } = useLabs();
  const activeLabs = labs.filter((lab) => lab.active);

  return (
    <FormField
      control={form.control}
// jscpd:ignore-start
      name={"labId" as Path<TFormValues>}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Lab</FormLabel>
          <Select
            value={field.value ?? LAB_UNASSIGNED_VALUE}
            onValueChange={(value) =>
              field.onChange(value === LAB_UNASSIGNED_VALUE ? undefined : value)
            }
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Assign to a lab" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={LAB_UNASSIGNED_VALUE}>
                Unassigned (all clinic orders)
              </SelectItem>
              {activeLabs.map((lab) => (
                <SelectItem key={lab.id} value={lab.id}>
                  {lab.name}
                  {lab.type === "EXTERNAL" ? " (External)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
// jscpd:ignore-end

type DoctorRegistrationField = "specialization" | "qualification" | "registrationNumber";

interface DoctorRegistrationFieldsProps<TFormValues extends FieldValues> {
  form: UseFormReturn<TFormValues>;
  /**
   * Translation function scoped to the calling component's namespace.
   * The caller must ensure the following keys exist:
   *   - `specializationLabel`, `specializationPlaceholder`
   *   - `qualificationLabel`, `qualificationPlaceholder`
   *   - `registrationNumberLabel`, `registrationNumberPlaceholder`
   */
  t: (key: string) => string;
}

const DOCTOR_REGISTRATION_FIELDS: ReadonlyArray<{
  name: DoctorRegistrationField;
  labelKey: string;
  placeholderKey: string;
}> = [
  {
    name: "specialization",
    labelKey: "specializationLabel",
    placeholderKey: "specializationPlaceholder",
  },
  {
    name: "qualification",
    labelKey: "qualificationLabel",
    placeholderKey: "qualificationPlaceholder",
  },
  {
    name: "registrationNumber",
    labelKey: "registrationNumberLabel",
    placeholderKey: "registrationNumberPlaceholder",
  },
];

export function DoctorRegistrationFields<TFormValues extends FieldValues>({
  form,
  t,
}: DoctorRegistrationFieldsProps<TFormValues>) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {DOCTOR_REGISTRATION_FIELDS.map(({ name, labelKey, placeholderKey }) => (
        <FormField
          key={name}
          control={form.control}
          name={name as Path<TFormValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t(labelKey)}</FormLabel>
              <FormControl>
                <Input placeholder={t(placeholderKey)} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
