import type { Control, FieldPath } from "react-hook-form";
import type { z } from "zod";
import { facilityLeadSubmitSchema } from "@workspace/types";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Input } from "@workspace/ui/components/form/input";

export type LeadFormValues = z.infer<typeof facilityLeadSubmitSchema>;

interface LeadTextFieldProps {
  control: Control<LeadFormValues>;
  name: FieldPath<LeadFormValues>;
  label: string;
  placeholder?: string;
  type?: string;
  /**
   * Keep the form value as undefined (not "") when the input is cleared —
   * required for the optional .url()/.email() fields, which reject "".
   */
  emptyToUndefined?: boolean;
  className?: string;
}

export function LeadTextField({
  control,
  name,
  label,
  placeholder,
  type = "text",
  emptyToUndefined = false,
  className,
}: LeadTextFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              value={typeof field.value === "string" ? field.value : ""}
              onChange={(event) =>
                field.onChange(
                  emptyToUndefined
                    ? event.target.value.trim() || undefined
                    : event.target.value,
                )
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}


