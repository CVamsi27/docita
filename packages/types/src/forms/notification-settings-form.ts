import { z } from "zod";

// allow-no-base-schema: owner=settings reason=ui-toggle-projection review=2026-09-30
export const notificationSettingsFormSchema = z.object({
  whatsappNotifications: z.boolean().optional(),
  inAppNotifications: z.boolean(),
});

export type NotificationSettingsFormValues = z.infer<
  typeof notificationSettingsFormSchema
>;
