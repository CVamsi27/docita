import type { ReactNode } from "react";
import { ClinicProvider } from "@/lib/contexts/clinic-context";

interface ProvidersWrapperProps {
  children: ReactNode;
}

export function ProvidersWrapper({ children }: ProvidersWrapperProps) {
  return <ClinicProvider>{children}</ClinicProvider>;
}
