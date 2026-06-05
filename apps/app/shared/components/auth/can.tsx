"use client";

import React, { type ReactNode } from "react";
import type { Feature, UserRole } from "@workspace/types";
import { type Permission, hasPermission, ROLE_HIERARCHY } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { usePermissionStore } from "@/lib/stores/permission-store";

export interface CanProps {
  /** Feature gate (tier + per-clinic override). */
  feature?: Feature;
  /** Permission-code gate (role × resource). */
  permission?: Permission;
  /** Minimum role gate (compared via the front-end role hierarchy). */
  requiredRole?: UserRole;
  /** Renders only when all supplied checks pass. */
  children: ReactNode;
  /** Renders when at least one check fails. */
  fallback?: ReactNode;
}

function meetsRole(
  userRole: UserRole | undefined,
  required: UserRole,
): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}

/**
 * Single decision hook combining feature gate (tier + override), role
 * hierarchy, and permission codes. Returns `true` when **all** supplied checks
 * pass; missing checks are ignored.
 */
export function useCan({
  feature,
  permission,
  requiredRole,
}: Omit<CanProps, "children" | "fallback">): boolean {
  const { user } = useAuth();
  const canAccess = usePermissionStore((state) => state.canAccess);

  if (feature !== undefined && !canAccess(feature, permission)) {
    return false;
  }

  if (permission !== undefined && user?.role) {
    if (!hasPermission(user.role, permission)) return false;
  } else if (permission !== undefined && !user?.role) {
    return false;
  }

  if (requiredRole !== undefined && !meetsRole(user?.role, requiredRole)) {
    return false;
  }

  return true;
}

/**
 * Unified gate. Wraps the legacy `<FeatureGate>`, `<RoleGuard>`, and
 * permission checks behind a single component. Existing components remain as
 * thin wrappers so call sites don't need to migrate immediately.
 *
 * ```tsx
 * <Can feature={Feature.WHATSAPP_MESSAGING} permission="messaging.send"
 *      requiredRole="DOCTOR" fallback={<LockedCard />}>
 *   <SendWhatsAppButton />
 * </Can>
 * ```
 */
export function Can({ children, fallback = null, ...checks }: CanProps) {
  const allowed = useCan(checks);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
