"use client";

// Stub AuthGuard - always allows access during migration
interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function AuthGuard({ children }: AuthGuardProps) {
  return <>{children}</>;
}
