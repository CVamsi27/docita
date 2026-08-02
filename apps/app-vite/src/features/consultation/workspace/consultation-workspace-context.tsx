import { createContext, useContext, type ReactNode } from "react";
import type { ClinicTypeFeatures } from "@workspace/types";
import type {
  ConsultationSection,
  ConsultationWorkspaceSectionId,
} from "@/features/consultation/workspace/consultation-section-registry";

interface ConsultationWorkspaceContextValue {
  clinicFeatures: ClinicTypeFeatures;
  sections: ConsultationSection[];
}

const ConsultationWorkspaceContext =
  createContext<ConsultationWorkspaceContextValue | null>(null);

export function ConsultationWorkspaceProvider({
  clinicFeatures,
  sections,
  children,
}: ConsultationWorkspaceContextValue & { children: ReactNode }) {
  return (
    <ConsultationWorkspaceContext.Provider value={{ clinicFeatures, sections }}>
      {children}
    </ConsultationWorkspaceContext.Provider>
  );
}

export function useConsultationWorkspace(): ConsultationWorkspaceContextValue {
  const ctx = useContext(ConsultationWorkspaceContext);
  if (!ctx) throw new Error(
    "useConsultationWorkspace must be used within ConsultationWorkspaceProvider",
  );
  return ctx;
}

export function useConsultationSectionSubtitle(
  sectionId: ConsultationWorkspaceSectionId,
): string | undefined {
  const { sections } = useConsultationWorkspace();
  return sections.find((s) => s.id === sectionId)?.subtitle;
}
