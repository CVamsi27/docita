import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
// jscpd:ignore-start
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";
// jscpd:ignore-end
import { DateTimePicker } from "@workspace/ui/components/form/date-time-picker";
import { createAppointmentSchema } from "@workspace/types";

type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

/**
 * Normalizes a `startTime`/`endTime` form value into the string shape
 * `DateTimePicker` expects — both fields can hold either a `Date` (set via
 * the picker) or an ISO string (set via slot selection), and both fields'
 * fallback render need the same conversion.
 */
function toDateTimePickerValue(value: Date | string | undefined) {
  return value instanceof Date ? value.toISOString() : value;
}

export interface ApiSlotOption {
  value: string;
  endIso: string;
  label: string;
}

interface SlotSelectOptionsProps {
  apiSlotOptions: ApiSlotOption[];
  disabled: boolean;
  hasError: boolean;
}

/** The `SelectTrigger`/`SelectContent` pairing for the slot dropdown — split out so the `FormField` render prop above stays focused on field wiring rather than the control's internal markup. */
function SlotSelectOptions({
  apiSlotOptions,
  disabled,
  hasError,
}: SlotSelectOptionsProps) {
  return (
    <>
      <FormControl>
        <SelectTrigger aria-invalid={hasError}>
          <SelectValue
            placeholder={
              disabled ? "Finding available slots…" : "Select a time slot"
            }
          />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {apiSlotOptions.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </>
  );
}

interface ApiSlotPickerFieldProps {
  form: UseFormReturn<CreateAppointmentInput>;
  apiSlotOptions: ApiSlotOption[];
  disabled: boolean;
  showEmptyMessage: boolean;
}

/** The API-resolved slot dropdown (plus its empty-state note) — split out as its own self-contained piece independent of the manual fallback beside it. */
export function ApiSlotPickerField({
  form,
  apiSlotOptions,
  disabled,
  showEmptyMessage,
}: ApiSlotPickerFieldProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="startTime"
        render={({ field }) => {
          const valueStr = typeof field.value === "string" ? field.value : "";
          return (
            <FormItem className="flex flex-col">
              <FormLabel>Appointment slot</FormLabel>
              <Select
                disabled={disabled}
                value={valueStr || undefined}
                onValueChange={(value) => {
                  const match = apiSlotOptions.find((o) => o.value === value);
                  field.onChange(value);
                  if (match) {
                    form.setValue("endTime", match.endIso, {
                      shouldValidate: true,
                    });
                  }
                }}
              >
                <SlotSelectOptions
                  apiSlotOptions={apiSlotOptions}
                  disabled={disabled}
                  hasError={!!form.formState.errors.startTime}
                />
              </Select>
              <FormMessage />
            </FormItem>
          );
        }}
      />
      {showEmptyMessage && (
        <p className="text-xs text-muted-foreground">
          No open slots for this doctor on this day. Try another day or adjust
          availability.
        </p>
      )}
    </div>
  );
}

interface ManualTimeRangeFieldsProps {
  form: UseFormReturn<CreateAppointmentInput>;
  startHour: number;
  endHour: number;
  todayStart: Date;
  disabled: boolean;
}

/** The manual start/end `DateTimePicker` pair — split out as its own self-contained fallback independent of the API slot picker beside it. Only renders when no date/doctor is selected, where the slot lookup never runs (so no loading message is needed). */
export function ManualTimeRangeFields({
  form,
  startHour,
  endHour,
  todayStart,
  disabled,
}: ManualTimeRangeFieldsProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="startTime"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Start time</FormLabel>
            <FormControl>
              <DateTimePicker
                value={toDateTimePickerValue(field.value)}
                onChange={field.onChange}
                startHour={startHour}
                endHour={endHour}
                minDate={todayStart}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="endTime"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>End time (optional)</FormLabel>
            <FormControl>
              <DateTimePicker
                value={toDateTimePickerValue(field.value)}
                onChange={field.onChange}
                startHour={startHour}
                endHour={endHour}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
