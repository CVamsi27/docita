import type { ReactNode } from "react";
import { ClinicProvider } from "@/lib/contexts/clinic-provider";

interface ProvidersWrapperProps {
  children: ReactNode;
}

export function ProvidersWrapper({ children }: ProvidersWrapperProps) {
  return <ClinicProvider>{children}</ClinicProvider>;
}
