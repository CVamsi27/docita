"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

export type ConsultationProgrammaticNavigate = (href: string) => void;

const ConsultationLeaveNavigationContext = createContext<
  ConsultationProgrammaticNavigate | null
>(null);

export function ConsultationLeaveNavigationProvider({
  attemptNavigateToHref,
  children,
}: {
  attemptNavigateToHref: ConsultationProgrammaticNavigate;
  children: ReactNode;
}) {
  const value = useMemo(
    () => attemptNavigateToHref,
    [attemptNavigateToHref],
  );
  return (
    <ConsultationLeaveNavigationContext.Provider value={value}>
      {children}
    </ConsultationLeaveNavigationContext.Provider>
  );
}

export function useConsultationProgrammaticNavigate(): ConsultationProgrammaticNavigate {
  const ctx = useContext(ConsultationLeaveNavigationContext);
  if (!ctx) {
    throw new Error(
      "useConsultationProgrammaticNavigate must be used within ConsultationLeaveNavigationProvider",
    );
  }
  return ctx;
}

/** Same as `useConsultationProgrammaticNavigate`, or `null` outside the provider. */
export function useOptionalConsultationProgrammaticNavigate(): ConsultationProgrammaticNavigate | null {
  return useContext(ConsultationLeaveNavigationContext);
}
