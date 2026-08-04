import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";

interface StepNavigationProps {
  sections: ConsultationSection[];
  activeIndex: number;
  onSelectSection: (id: string) => void;
}

export function StepNavigation({
  sections,
  activeIndex,
  onSelectSection,
}: StepNavigationProps) {
  if (sections.length <= 1) return null;

  const prevSection = activeIndex > 0 ? sections[activeIndex - 1] : undefined;
  const nextSection =
    activeIndex < sections.length - 1 ? sections[activeIndex + 1] : undefined;

  return (
    <div className="flex items-center justify-between gap-3">
      {prevSection ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onSelectSection(prevSection.id)}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">
            {prevSection.shortLabel}
          </span>
          <span className="sm:hidden">Back</span>
        </Button>
      ) : (
        <span />
      )}
      {nextSection ? (
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={() => onSelectSection(nextSection.id)}
        >
          <span className="hidden sm:inline">
            Next · {nextSection.shortLabel}
          </span>
          <span className="sm:hidden">Next</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/8 px-3 py-1.5 text-xs font-medium text-success">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          All steps done
        </span>
      )}
    </div>
  );
}
