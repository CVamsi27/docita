import { z } from "zod";

/**
 * Post-onboarding guided experience shown on `/today`:
 *  - a one-time welcome **tour** (status state machine + resume step), and
 *  - a getting-started **checklist** (dismissal only; item completion is
 *    derived from live data signals on the client, never stored here).
 *
 * Mirrors the Prisma `GuidedTourStatus` enum + the `User.guidedTour*` /
 * `User.checklistDismissedAt` columns.
 */
export const guidedTourStatusSchema = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "SKIPPED",
]);

export const guidedTourStateSchema = z.object({
  status: guidedTourStatusSchema,
  lastStep: z.number().int().min(0),
  completedAt: z.union([z.string(), z.date()]).nullable(),
  checklistDismissedAt: z.union([z.string(), z.date()]).nullable(),
});

export const updateGuidedTourRequestSchema = z
  .object({
    status: guidedTourStatusSchema.optional(),
    lastStep: z.number().int().min(0).optional(),
    checklistDismissed: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.lastStep !== undefined ||
      data.checklistDismissed !== undefined,
    { message: "Update at least one field before saving." },
  );

export type GuidedTourStatusValue = z.infer<typeof guidedTourStatusSchema>;
export type GuidedTourState = z.infer<typeof guidedTourStateSchema>;
export type UpdateGuidedTourRequest = z.infer<
  typeof updateGuidedTourRequestSchema
>;
