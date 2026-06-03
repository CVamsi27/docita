"use client";

import React, { ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";
import type { UserRole } from "@workspace/types";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { persistReturnPathBeforeLogin } from "@/lib/auth/safe-return-path";

interface RoleGuardProps {
  children: ReactNode;
  requiredPermission?: Permission;
  requiredRole?: UserRole;
  fallback?: ReactNode;
}

export function RoleGuard({
  children,
  requiredPermission,
  requiredRole,
  fallback,
}: RoleGuardProps) {
  const { user } = useAuth();
  const router = useRouter();

  const needsLoginRedirect =
    !!(requiredPermission || requiredRole) && !user?.role && !fallback;

  useEffect(() => {
    if (!needsLoginRedirect) {
      return;
    }
    persistReturnPathBeforeLogin();
    router.push("/login");
  }, [needsLoginRedirect, router]);

  if (!requiredPermission && !requiredRole) {
    return <>{children}</>;
  }

  if (!user?.role) {
    if (fallback) {
      return <>{fallback}</>;
    }
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
