"use client";

import { SectionRail } from "@/features/consultation/workspace/chrome/SectionRail";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";

interface ConsultationLeftRailProps {
  sections: ConsultationSection[];
  activeSectionId: string;
  onSelect: (id: string) => void;
}

export function ConsultationLeftRail({
  sections,
  activeSectionId,
  onSelect,
}: ConsultationLeftRailProps) {
  return (
    <SectionRail
      sections={sections}
      activeSectionId={activeSectionId}
      onSelect={onSelect}
      className="w-56 shrink-0"
    />
  );
}
