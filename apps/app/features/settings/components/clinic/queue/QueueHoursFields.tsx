import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Input } from "@workspace/ui/components/form/input";
import type { UseFormReturn } from "react-hook-form";
import type { QueueSettingsFormValues } from "@workspace/types";

interface QueueHoursFieldsProps {
  form: UseFormReturn<QueueSettingsFormValues>;
}

export function QueueHoursFields({ form }: QueueHoursFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <FormField
        control={form.control}
        name="avgConsultationMinutes"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="avg-consultation">Avg. Consultation (min)</FormLabel>
            <FormControl>
              <Input id="avg-consultation" type="number" min={1} max={120} {...field} />
            </FormControl>
            <p className="text-xs text-muted-foreground">Used to estimate wait times</p>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="lateArrivalGraceMinutes"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="late-arrival">Late Arrival Grace (min)</FormLabel>
            <FormControl>
              <Input id="late-arrival" type="number" min={0} max={120} {...field} />
            </FormControl>
            <p className="text-xs text-muted-foreground">Allow patients to join queue after this grace period</p>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="queueBufferMinutes"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="queue-buffer">Queue Buffer (min)</FormLabel>
            <FormControl>
              <Input id="queue-buffer" type="number" min={0} max={120} {...field} />
            </FormControl>
            <p className="text-xs text-muted-foreground">Extra time added between appointments</p>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
