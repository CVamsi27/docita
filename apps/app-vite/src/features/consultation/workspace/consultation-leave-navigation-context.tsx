import { createContext, useMemo, type ReactNode } from "react";

type ConsultationProgrammaticNavigate = (href: string) => void;

const ConsultationLeaveNavigationContext =
  createContext<ConsultationProgrammaticNavigate | null>(null);

export function ConsultationLeaveNavigationProvider({
  attemptNavigateToHref,
  children,
}: {
  attemptNavigateToHref: ConsultationProgrammaticNavigate;
  children: ReactNode;
}) {
  const value = useMemo(() => attemptNavigateToHref, [attemptNavigateToHref]);
  return (
    <ConsultationLeaveNavigationContext.Provider value={value}>
      {children}
    </ConsultationLeaveNavigationContext.Provider>
  );
}

/** Same as `useConsultationProgrammaticNavigate`, or `null` outside the provider. */