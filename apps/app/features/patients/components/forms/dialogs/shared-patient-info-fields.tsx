"use client";

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
  dateOfBirthRequired?: boolean;
  genderRequired?: boolean;
}

export function SharedPatientNameFields<T extends FieldValues>({
  control,
}: SharedPatientInfoFieldsProps<T>) {
  return (
    <>
      <FormField control={control} name={"firstName" as Path<T>} render={({ field }) => (
        <FormItem>
          <FormLabel>First Name <span className="text-destructive ml-0.5">*</span></FormLabel>
          <FormControl><Input {...field} placeholder="First name" /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name={"lastName" as Path<T>} render={({ field }) => (
        <FormItem>
          <FormLabel>Last Name <span className="text-destructive ml-0.5">*</span></FormLabel>
          <FormControl><Input {...field} placeholder="Last name" /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </>
  );
}

export function SharedPatientContactFields<T extends FieldValues>({
  control,
}: SharedPatientInfoFieldsProps<T>) {
  return (
    <>
      <FormField control={control} name={"phoneNumber" as Path<T>} render={({ field }) => (
        <FormItem>
          <FormLabel>Phone</FormLabel>
          <FormControl><Input {...field} value={field.value ?? ""} placeholder="Phone number" inputMode="tel" /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name={"email" as Path<T>} render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl><Input {...field} value={field.value ?? ""} type="email" placeholder="Email" /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
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
