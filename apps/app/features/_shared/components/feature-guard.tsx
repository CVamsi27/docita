"use client";

// Stub FeatureGuard - always allows access during migration
interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGuard({ children }: FeatureGuardProps) {
  return <>{children}</>;
}
