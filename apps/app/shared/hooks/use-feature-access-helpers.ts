import {
  clinicTypeSchema,
  userRoleSchema,
  type ClinicType,
  type Feature,
  type UserRole,
} from "@workspace/types";
import type { Permission } from "@/lib/auth/permissions";
import {
  AddOnType,
  type IAccessContext,
} from "@/lib/access-control/interfaces";

export function resolveClinicTypeForAccess(
  type: string | undefined,
): ClinicType | undefined {
  const parsed = clinicTypeSchema.safeParse(type);
  return parsed.success ? parsed.data : undefined;
}

export function resolveUserRoleForAccess(role: string | undefined): UserRole {
  const parsed = userRoleSchema.safeParse(role);
  return parsed.success ? parsed.data : "RECEPTIONIST";
}

export function buildFeatureAccessContext(input: {
  feature: Feature | string;
  userId: string;
  currentTier: IAccessContext["subscription"]["tier"];
  hasIntelligence: boolean;
  userRole: UserRole;
  clinicType?: string;
  requiredPermission?: Permission;
}): IAccessContext {
  const intelligenceAddOn = input.hasIntelligence
    ? [
        {
          type: AddOnType.INTELLIGENCE,
          status: "active" as const,
          baseQuota: 500,
          usedQuota: 0,
          overageRate: 3,
          billingCycle: "monthly" as const,
        },
      ]
    : [];

  return {
    feature: input.feature,
    userId: input.userId,
    subscription: {
      tier: input.currentTier,
      status: "active",
      features: [],
      startDate: new Date(),
      billingCycle: "monthly",
    },
    addOns: intelligenceAddOn,
    overrides: [],
    userRole: input.userRole,
    requiredPermission: input.requiredPermission,
    clinicType: resolveClinicTypeForAccess(input.clinicType),
  };
}
