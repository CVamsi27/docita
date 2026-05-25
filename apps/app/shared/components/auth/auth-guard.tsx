"use client";

import { useAuth } from "@/lib/auth/auth-context";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const { user } = useAuth();

  if (requiredRoles && requiredRoles.length > 0) {
    if (!user?.role || !requiredRoles.includes(user.role)) {
      return null;
    }
  }

  return <>{children}</>;
}
