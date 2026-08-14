import { z } from "zod";

// allow-no-base-schema: owner=front-desk reason=ui-queue-settings review=2026-09-30
export const queueSettingsFormSchema = z.object({
  avgConsultationMinutes: z.coerce.number().int().min(1).max(120),
  lateArrivalGraceMinutes: z.coerce.number().int().min(0).max(120),
  queueBufferMinutes: z.coerce.number().int().min(0).max(120),
  useDoctorQueues: z.boolean(),
});

export type QueueSettingsFormValues = z.infer<typeof queueSettingsFormSchema>;
