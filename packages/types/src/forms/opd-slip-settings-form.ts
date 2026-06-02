import { z } from "zod";

/**
 * Admin-configurable defaults for the printable OPD prescription slip
 * (Front Desk surfaces). The slip itself carries no clinical authoring — these
 * settings only tune the printed validity notice and an optional footer line.
 */
export const opdSlipSettingsFormSchema = z.object({
  /**
   * Free-revisit window printed on the slip, in days. `0` (or unset) hides the
   * notice entirely.
   */
  revisitValidityDays: z.number().int().min(0).max(365),
  /** Optional extra footer line (e.g. clinic-specific instructions). */
  footerNote: z.string().max(500),
});

export type OpdSlipSettingsFormValues = z.infer<
  typeof opdSlipSettingsFormSchema
>;
