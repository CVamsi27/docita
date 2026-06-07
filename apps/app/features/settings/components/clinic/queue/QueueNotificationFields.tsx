import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Switch } from "@workspace/ui/components/form/switch";
import type { UseFormReturn } from "react-hook-form";
import type { QueueSettingsFormValues } from "@workspace/types";

interface QueueNotificationFieldsProps {
  form: UseFormReturn<QueueSettingsFormValues>;
}

export function QueueNotificationFields({ form }: QueueNotificationFieldsProps) {
  return (
    <FormField
      control={form.control}
      name="useDoctorQueues"
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Use Per-Doctor Queues</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Maintain separate queues for each doctor</p>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
