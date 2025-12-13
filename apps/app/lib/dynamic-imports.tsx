/**
 * Centralized dynamic imports configuration for heavy components
 * This helps reduce initial bundle size by lazy-loading components on-demand
 */

import dynamic from "next/dynamic";
import type { ClinicalDocumentationProps } from "@/components/consultation/clinical-documentation";
import type { ClinicalExaminationProps } from "@/components/consultation/clinical-examination";
import type { SubscriptionSettingsProps } from "@/components/settings/subscription-settings";
import type { DoctorAvailabilitySettingsProps } from "@/components/settings/doctor-availability-settings";
import type { TemplatesSettingsProps } from "@/components/settings/templates-settings";
import type { DrugInteractionCheckerProps } from "@/components/prescription/drug-interaction-checker";
import type {
  FeedbackFormDialogProps,
  FeedbackFormProps,
} from "@/components/feedback/feedback-form";
import type { PatientBadgeProps } from "@/components/patients/patient-badge";
import type { VoiceRecorderProps } from "@/components/common/voice-recorder";
import type { FollowUpSchedulerProps } from "@/components/appointments/follow-up-scheduler";
import type { ConsultationContentProps } from "@/components/consultation/consultation-content";
import type { PrescriptionTemplateManagerProps } from "@/components/prescription/prescription-template-manager";

// Heavy consultation components (>900 lines)
export const ClinicalDocumentationDynamic = dynamic(
  () =>
    import("@/components/consultation/clinical-documentation").then(
      (mod) => mod.ClinicalDocumentation,
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    ),
    ssr: false,
  },
);

export type ClinicalDocumentationDynamicProps = ClinicalDocumentationProps;

export const ClinicalExaminationDynamic = dynamic(
  () =>
    import("@/components/consultation/clinical-examination").then(
      (mod) => mod.ClinicalExamination,
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    ),
    ssr: false,
  },
);

export type ClinicalExaminationDynamicProps = ClinicalExaminationProps;

// Heavy settings components (>1000 lines)
export const SubscriptionSettingsDynamic = dynamic(
  () =>
    import("@/components/settings/subscription-settings").then(
      (mod) => mod.SubscriptionSettings,
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    ),
    ssr: false,
  },
);

export type SubscriptionSettingsDynamicProps = SubscriptionSettingsProps;

export const DoctorAvailabilitySettingsDynamic = dynamic(
  () =>
    import("@/components/settings/doctor-availability-settings").then(
      (mod) => mod.DoctorAvailabilitySettings,
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    ),
    ssr: false,
  },
);

export type DoctorAvailabilitySettingsDynamicProps =
  DoctorAvailabilitySettingsProps;

export const TemplatesSettingsDynamic = dynamic(
  () =>
    import("@/components/settings/templates-settings").then(
      (mod) => mod.TemplatesSettings,
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    ),
    ssr: false,
  },
);

export type TemplatesSettingsDynamicProps = TemplatesSettingsProps;

// Medium-heavy components (400-500 lines)
export const DrugInteractionCheckerDynamic = dynamic(
  () =>
    import("@/components/prescription/drug-interaction-checker").then(
      (mod) => mod.DrugInteractionChecker,
    ),
  {
    loading: () => (
      <div className="p-4 border rounded-lg bg-muted/50 text-sm text-muted-foreground">
        Loading drug interaction checker...
      </div>
    ),
    ssr: false,
  },
);

export type DrugInteractionCheckerDynamicProps = DrugInteractionCheckerProps;

export const FeedbackFormDynamic = dynamic(
  () =>
    import("@/components/feedback/feedback-form").then(
      (mod) => mod.FeedbackForm,
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    ),
    ssr: false,
  },
);

export type FeedbackFormDynamicProps = FeedbackFormProps;

export const FeedbackFormDialogDynamic = dynamic(
  () =>
    import("@/components/feedback/feedback-form").then(
      (mod) => mod.FeedbackFormDialog,
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    ),
    ssr: false,
  },
);

export type FeedbackFormDialogDynamicProps = FeedbackFormDialogProps;

export const PatientBadgeDynamic = dynamic(
  () =>
    import("@/components/patients/patient-badge").then(
      (mod) => mod.PatientBadge,
    ),
  {
    loading: () => <div className="h-6 bg-muted rounded animate-pulse" />,
    ssr: false,
  },
);

export type PatientBadgeDynamicProps = PatientBadgeProps;

export const VoiceRecorderDynamic = dynamic(
  () =>
    import("@/components/common/voice-recorder").then(
      (mod) => mod.VoiceRecorder,
    ),
  {
    loading: () => <div className="h-10 bg-muted rounded animate-pulse" />,
    ssr: false,
  },
);

export type VoiceRecorderDynamicProps = VoiceRecorderProps;

export const FollowUpSchedulerDynamic = dynamic(
  () =>
    import("@/components/appointments/follow-up-scheduler").then(
      (mod) => mod.FollowUpScheduler,
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    ),
    ssr: false,
  },
);

export type FollowUpSchedulerDynamicProps = FollowUpSchedulerProps;

// For components that can be rendered on server but are heavy
// Use ssr: true for better initial paint
export const ConsultationContentSSR = dynamic(
  () =>
    import("@/components/consultation/consultation-content").then(
      (mod) => mod.ConsultationContent,
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    ),
    ssr: true,
  },
);

export type ConsultationContentSSRProps = ConsultationContentProps;

export const PrescriptionTemplateManagerSSR = dynamic(
  () =>
    import("@/components/prescription/prescription-template-manager").then(
      (mod) => mod.PrescriptionTemplateManager,
    ),
  {
    loading: () => <div className="h-10 bg-muted rounded animate-pulse" />,
    ssr: true,
  },
);

export type PrescriptionTemplateManagerSSRProps =
  PrescriptionTemplateManagerProps;
