import { z } from "zod";
import { APP_ACCESS_TARGETS } from "../access/access-matrix";
import { planModeSchema } from "../billing/tier";
import { userRoleSchema } from "../shared/users/roles";

/**
 * Server-derived permission snapshot for the authenticated user (C7,
 * ADR-0013). The UI consumes it to preview decisions; the server remains the
 * enforcement point — this payload is NON-authoritative by design. `targets`
 * maps every matrix target to its resolved read/write access for the user's
 * role + clinic (tier/planMode/features). INTERNAL snapshots have every target
 * true (the internal admin bypass, mirroring RolesGuard/INTERNAL handling).
 */
export const effectivePermissionsResponseSchema = z.object({
  role: userRoleSchema,
  tier: z.string(),
  planMode: planModeSchema,
  hasIntelligence: z.boolean(),
  permissions: z.array(z.string()),
  targets: z.record(
    z.enum(Object.values(APP_ACCESS_TARGETS) as [string, ...string[]]),
    z.object({
      read: z.boolean(),
      write: z.boolean(),
    }),
  ),
  generatedAt: z.string(),
});

export type EffectivePermissionsResponse = z.infer<
  typeof effectivePermissionsResponseSchema
>;
