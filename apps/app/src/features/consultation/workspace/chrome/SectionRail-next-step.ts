import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";

export function findNextStep(
  sections: ConsultationSection[],
  completion: Record<string, boolean>,
): ConsultationSection | null {
  return (
    sections.find((section) => section.required && !completion[section.id]) ??
    sections.find((section) => !completion[section.id]) ??
    null
  );
}
