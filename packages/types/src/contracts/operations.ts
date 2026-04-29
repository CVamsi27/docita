import { z } from "zod";

export const tenantScopeRuleKindSchema = z.enum(["direct", "relation"]);

export const tenantScopeRuleSchema = z.object({
  model: z.string().min(1),
  kind: tenantScopeRuleKindSchema,
  path: z.array(z.string().min(1)).optional(),
});

export const tenantScopeDiagnosticsSchema = z.object({
  totalModels: z.number().int().nonnegative(),
  clinicIdModels: z.number().int().nonnegative(),
  scopedModels: z.number().int().nonnegative(),
  directScopedModels: z.number().int().nonnegative(),
  relationScopedModels: z.number().int().nonnegative(),
  uncoveredClinicIdModels: z.array(z.string()),
  excludedClinicIdModels: z.array(z.string()),
  staleRelationRules: z.array(z.string()),
  rules: z.array(tenantScopeRuleSchema),
  generatedAt: z.string().datetime(),
});

export type TenantScopeRule = z.infer<typeof tenantScopeRuleSchema>;
export type TenantScopeDiagnostics = z.infer<
  typeof tenantScopeDiagnosticsSchema
>;
