import type { ReactNode } from "react";
import type { ClinicTypeFeatures } from "@workspace/types";
import type {
  ConsultationSection,
} from "@/features/consultation/workspace/consultation-section-registry";
import { ConsultationWorkspaceContext } from "./consultation-workspace-context";

interface ConsultationWorkspaceProviderProps {
  clinicFeatures: ClinicTypeFeatures;
  sections: ConsultationSection[];
  children: ReactNode;
}

export function ConsultationWorkspaceProvider({
  clinicFeatures,
  sections,
  children,
}: ConsultationWorkspaceProviderProps) {
  return (
    <ConsultationWorkspaceContext.Provider value={{ clinicFeatures, sections }}>
      {children}
    </ConsultationWorkspaceContext.Provider>
  );
}
