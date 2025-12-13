"use client";

import { type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { hasPermission, type Permission } from "@/lib/permissions";

interface RequirePermissionProps {
  /**
   * The permission required to render children
   */
  permission: Permission;

  /**
   * Content to render when user has permission
   */
  children: ReactNode;

  /**
   * Optional fallback content when user lacks permission
   */
  fallback?: ReactNode;

  /**
   * If true, renders nothing when user lacks permission (instead of fallback)
   */
  silent?: boolean;
}

/**
 * Permission-gated component wrapper.
 *
 * Renders children only if the current user has the required permission.
 *
 * @example
 * ```tsx
 * <RequirePermission permission="manageStaff">
 *   <StaffManagementPanel />
 * </RequirePermission>
 *
 * <RequirePermission permission="manageBilling" fallback={<UpgradeBanner />}>
 *   <BillingSection />
 * </RequirePermission>
 * ```
 */
export function RequirePermission({
  permission,
  children,
  fallback = null,
  silent = false,
}: RequirePermissionProps): ReactNode {
  const { user } = useAuth();

  // If no user, treat as no permission
  if (!user?.role) {
    return silent ? null : fallback;
  }

  // Check if user has the required permission
  if (!hasPermission(user.role, permission)) {
    return silent ? null : fallback;
  }

  return children;
}

interface RequireAnyPermissionProps {
  permissions: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
  silent?: boolean;
}

/**
 * Renders children if user has ANY of the specified permissions.
 */
export function RequireAnyPermission({
  permissions,
  children,
  fallback = null,
  silent = false,
}: RequireAnyPermissionProps): ReactNode {
  const { user } = useAuth();

  if (!user?.role) {
    return silent ? null : fallback;
  }

  const hasAny = permissions.some((p) => hasPermission(user.role, p));

  if (!hasAny) {
    return silent ? null : fallback;
  }

  return children;
}

interface RequireRoleProps {
  roles: string[];
  children: ReactNode;
  fallback?: ReactNode;
  silent?: boolean;
}

/**
 * Renders children if user has one of the specified roles.
 */
export function RequireRole({
  roles,
  children,
  fallback = null,
  silent = false,
}: RequireRoleProps): ReactNode {
  const { user } = useAuth();

  if (!user?.role || !roles.includes(user.role)) {
    return silent ? null : fallback;
  }

  return children;
}
