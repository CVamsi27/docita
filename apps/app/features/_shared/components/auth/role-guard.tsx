"use client";

import React, { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";

interface RoleGuardProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  fallback?: ReactNode;
}

export function RoleGuard({
  children,
  requiredPermission,
  requiredRole,
  fallback,
}: RoleGuardProps) {
  const { user } = useAuth();

  if (!requiredPermission && !requiredRole) {
    return <>{children}</>;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
