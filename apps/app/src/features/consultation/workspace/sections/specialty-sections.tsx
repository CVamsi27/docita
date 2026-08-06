import { lazy, Suspense, type Ref } from "react";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { useConsultationSectionSubtitle } from "@/features/consultation/workspace/consultation-workspace-context";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";

interface SectionProps {
  readOnly?: boolean;
  sectionRef?: Ref<HTMLElement>;
}

interface InvestigationsSectionProps extends SectionProps {
  patientId?: string;
  appointmentId?: string;
  doctorId?: string;
}

function SectionLoading() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 p-8"
      role="status"
      aria-label="Loading consultation section"
      aria-live="polite"
    >
      <DocitaLoadingIndicator
        variant="section"
        withStatusRole={false}
        iconClassName="h-8 w-8"
      />
      <Skeleton className="h-3 w-40 max-w-full" />
    </div>
  );
}

function withSectionLoading<T extends object>(
  Component: React.ComponentType<T>,
) {
  return function SectionLazy(props: T) {
    return (
      <Suspense fallback={<SectionLoading />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

const DentalChartUILazy = withSectionLoading(
  lazy(() =>
    import("@/features/consultation/components/specialty/DentalChartUI").then(
      (m) => ({ default: m.DentalChartUI }),
    ),
  ),
);
const GrowthChartUILazy = withSectionLoading(
  lazy(() =>
    import("@/features/consultation/components/specialty/GrowthChartUI").then(
      (m) => ({ default: m.GrowthChartUI }),
    ),
  ),
);
const VisionExamUILazy = withSectionLoading(
  lazy(() =>
    import("@/features/consultation/components/specialty/VisionExamUI").then(
      (m) => ({ default: m.VisionExamUI }),
    ),
  ),
);
const CardiologyExamSectionLazy = withSectionLoading(
  lazy(() =>
    import("@/features/consultation/components/specialty/cardiology-specialty-sections").then(
      (m) => ({ default: m.CardiologyExamSection }),
    ),
  ),
);
const DermatologyExamSectionLazy = withSectionLoading(
  lazy(() =>
    import("@/features/consultation/components/specialty/dermatology-specialty-sections").then(
      (m) => ({ default: m.DermatologyExamSection }),
    ),
  ),
);
const GynecologyExamSectionLazy = withSectionLoading(
  lazy(() =>
    import("@/features/consultation/components/specialty/gynecology-specialty-sections").then(
      (m) => ({ default: m.GynecologyExamSection }),
    ),
  ),
);
const PsychiatryExamSectionLazy = withSectionLoading(
  lazy(() =>
    import("@/features/consultation/components/specialty/psychiatry-specialty-sections").then(
      (m) => ({ default: m.PsychiatryExamSection }),
    ),
  ),
);
const InvestigationsSectionLazy = withSectionLoading(
  lazy(() =>
    import("@/features/consultation/components/specialty/investigations-specialty-sections").then(
      (m) => ({ default: m.InvestigationsSection }),
    ),
  ),
);

export function DentalSpecialtySection({ readOnly, sectionRef }: SectionProps) {
  const subtitle = useConsultationSectionSubtitle("specialty-dental");
  const dentalChart = useConsultationDraft((s) => s.dentalChart);
  const setDentalChart = useConsultationDraft((s) => s.setDentalChart);
  return (
    <SectionContainer
      ref={sectionRef}
      id="specialty-dental"
      letter="D"
      title="Dental Chart"
      subtitle={subtitle}
      description="Per-tooth charting with notes."
    >
      <DentalChartUILazy
        value={dentalChart}
        onChange={setDentalChart}
        readOnly={readOnly}
      />
    </SectionContainer>
  );
}

export function VisionSpecialtySection({ readOnly, sectionRef }: SectionProps) {
  const subtitle = useConsultationSectionSubtitle("specialty-vision");
  const eyeExam = useConsultationDraft((s) => s.eyeExam);
  const setEyeExam = useConsultationDraft((s) => s.setEyeExam);
  return (
    <SectionContainer
      ref={sectionRef}
      id="specialty-vision"
      letter="V"
      title="Vision Exam"
      subtitle={subtitle}
      description="Refraction, IOP, anterior and posterior segment findings."
    >
      <VisionExamUILazy
        value={eyeExam}
        onChange={setEyeExam}
        readOnly={readOnly}
      />
    </SectionContainer>
  );
}

export function GrowthSpecialtySection({ readOnly, sectionRef }: SectionProps) {
  const subtitle = useConsultationSectionSubtitle("specialty-growth");
  const growthData = useConsultationDraft((s) => s.growthData);
  const setGrowthData = useConsultationDraft((s) => s.setGrowthData);
  return (
    <SectionContainer
      ref={sectionRef}
      id="specialty-growth"
      letter="G"
      title="Growth Chart"
      subtitle={subtitle}
      description="Anthropometric measurements plotted against WHO references."
    >
      <GrowthChartUILazy
        value={growthData}
        onChange={setGrowthData}
        readOnly={readOnly}
      />
    </SectionContainer>
  );
}

export function CardiologyExamSection(props: SectionProps) {
  return <CardiologyExamSectionLazy {...props} />;
}
export function DermatologyExamSection(props: SectionProps) {
  return <DermatologyExamSectionLazy {...props} />;
}
export function GynecologyExamSection(props: SectionProps) {
  return <GynecologyExamSectionLazy {...props} />;
}
export function PsychiatryExamSection(props: SectionProps) {
  return <PsychiatryExamSectionLazy {...props} />;
}
export function InvestigationsSection(props: InvestigationsSectionProps) {
  return <InvestigationsSectionLazy {...props} />;
}
