"use client";

import React, { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";

interface RoleGuardProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  fallback?: ReactNode;
}

/**
 * RoleGuard - Controls content visibility based on user role/permissions
 * For now, this is a passthrough that can be enhanced with actual permission checks
 */
export function RoleGuard({
  children,
  requiredPermission,
  requiredRole,
  fallback,
}: RoleGuardProps) {
  const { user } = useAuth();

  // If no specific requirements, render children
  if (!requiredPermission && !requiredRole) {
    return <>{children}</>;
  }

  // Check role if required
  if (requiredRole && user?.role !== requiredRole) {
    return fallback ? <>{fallback}</> : null;
  }

  // For permission-based checks, implement based on your permission system
  // Currently returns children as permission system may be handled elsewhere
  return <>{children}</>;
}
