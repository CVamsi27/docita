"use client";

import type { FieldValues, UseFormReturn, Path } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
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
