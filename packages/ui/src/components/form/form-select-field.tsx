"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export interface FormSelectOption<TValue extends string = string> {
  value: TValue;
  label: string;
  disabled?: boolean;
}

export interface FormSelectFieldProps<
  TForm extends FieldValues,
  TValue extends string = string,
> {
  control: Control<TForm>;
  /** Typed literal field name (e.g. "leaveType"); use `rhfPath<TForm>()` for dynamic paths. */
  name: Path<TForm>;
  label: string;
  placeholder?: string;
  options: ReadonlyArray<FormSelectOption<TValue>>;
  /**
   * Sentinel value rendered when the field is unset; selecting it clears the
   * field back to `undefined` (e.g. an explicit "self" or "unassigned" option
   * for an optional staff/lab id). Option values must not collide with the
   * sentinel — selecting an option equal to it would clear the field instead
   * of setting it.
   */
  unsetValue?: TValue;
  /** Label rendered for the unset sentinel option (used only with `unsetValue`). */
  unsetLabel?: string;
  className?: string;
}

/**
 * A label + `Select` field wired to React Hook Form. Absorbs the repeated
 * FormField → FormItem → FormLabel → Select → FormControl → SelectTrigger →
 * SelectContent scaffold for option maps (label-map enums, fixed option lists,
 * staff/member pickers with an explicit unset sentinel). Per-option `disabled`
 * lets callers gate items dynamically (e.g. a claim type that requires an
 * invoice to exist).
 */
export function FormSelectField<
  TForm extends FieldValues,
  TValue extends string = string,
>({
  control,
  name,
  label,
  placeholder,
  options,
  unsetValue,
  unsetLabel,
  className,
}: FormSelectFieldProps<TForm, TValue>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          {/* jscpd:ignore-start */}
          <Select
            value={field.value ?? unsetValue ?? ""}
            onValueChange={(value) =>
              field.onChange(
                unsetValue !== undefined && value === unsetValue
                  ? undefined
                  : value,
              )
            }
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {unsetValue !== undefined && unsetLabel !== undefined && (
                <SelectItem value={unsetValue}>{unsetLabel}</SelectItem>
              )}
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* jscpd:ignore-end */}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
