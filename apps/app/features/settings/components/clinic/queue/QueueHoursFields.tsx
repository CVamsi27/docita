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
import { useTranslations } from "next-intl";

interface QueueHoursFieldsProps {
  form: UseFormReturn<QueueSettingsFormValues>;
}

/**
 * Phase 3 (per-feature): apps/app Settings > Queue hours fields.
 * 6 literals converted to useTranslations("Settings.queueHoursFields").
 */
function useQueueHoursFieldsTranslations() {
  return useTranslations("Settings.queueHoursFields");
}

export function QueueHoursFields({ form }: QueueHoursFieldsProps) {
  const t = useQueueHoursFieldsTranslations();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <FormField
        control={form.control}
        name="avgConsultationMinutes"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="avg-consultation">{t("avgConsultationLabel")}</FormLabel>
            <FormControl>
              <Input id="avg-consultation" type="number" min={1} max={120} {...field} />
            </FormControl>
            <p className="text-xs text-muted-foreground">{t("avgConsultationHelper")}</p>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="lateArrivalGraceMinutes"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="late-arrival">{t("lateArrivalLabel")}</FormLabel>
            <FormControl>
              <Input id="late-arrival" type="number" min={0} max={120} {...field} />
            </FormControl>
            <p className="text-xs text-muted-foreground">{t("lateArrivalHelper")}</p>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="queueBufferMinutes"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="queue-buffer">{t("queueBufferLabel")}</FormLabel>
            <FormControl>
              <Input id="queue-buffer" type="number" min={0} max={120} {...field} />
            </FormControl>
            <p className="text-xs text-muted-foreground">{t("queueBufferHelper")}</p>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
