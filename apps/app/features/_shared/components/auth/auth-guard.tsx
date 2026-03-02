"use client";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function AuthGuard({ children }: AuthGuardProps) {
  return <>{children}</>;
}
