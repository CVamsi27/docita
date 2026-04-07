"use client";

import React, { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import type { UserRole } from "@workspace/types";
import { hasPermission, type Permission } from "@/lib/permissions";

interface RoleGuardProps {
  children: ReactNode;
  requiredPermission?: Permission;
  requiredRole?: UserRole;
  fallback?: ReactNode;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  INTERNAL: 5,
  ADMIN: 4,
  ADMIN_DOCTOR: 3,
  DOCTOR: 2,
  RECEPTIONIST: 1,
  PATIENT: 0,
};

function hasRoleAccess(userRole: UserRole | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function RoleGuard({
  children,
  requiredPermission,
  requiredRole,
  fallback,
}: RoleGuardProps) {
  const { user } = useAuth();
  const router = useRouter();

  if (!requiredPermission && !requiredRole) {
    return <>{children}</>;
  }

  if (!user?.role) {
    if (fallback) {
      return <>{fallback}</>;
    }
    router.push("/login");
    return null;
  }

  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return fallback ? <>{fallback}</> : null;
  }

  if (requiredRole && !hasRoleAccess(user.role, requiredRole)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
