"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useClinicRegistrationFlow } from "@/features/onboarding/hooks/use-clinic-registration-flow";
import { useAuth } from "@/lib/auth-context";
import {
  ClinicDetailsStep,
  ComplianceStep,
  PlanSelectionStep,
  TeamInviteStep,
} from "@/features/onboarding/components/steps";
import {
  type ClinicDetails,
  clinicDetailsSchema,
  complianceSchema,
  type ComplianceSettings,
  defaultComplianceValues,
  type PlanSelection,
} from "@/features/onboarding/components/types";

const STEP_LABELS: Record<number, string> = {
  1: "Clinic Details",
  2: "Plan Selection",
  3: "Team Plan",
  4: "Compliance",
};

const TOTAL_STEPS = 4;

export function ClinicRegistrationForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const {
    step,
    setStep,
    formData,
    setClinicDetails,
    setPlanSelection,
    setTeamMembers,
    goBackFromCompliance,
    submitRegistration,
    uploadSlaSignature,
  } = useClinicRegistrationFlow();

  const clinicForm = useForm<ClinicDetails>({
    resolver: zodResolver(clinicDetailsSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    criteriaMode: "all",
    shouldFocusError: true,
    defaultValues: formData.clinicDetails as ClinicDetails,
  });

  const complianceForm = useForm<ComplianceSettings>({
    resolver: zodResolver(complianceSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    criteriaMode: "all",
    shouldFocusError: true,
    defaultValues: {
      ...defaultComplianceValues,
      ...formData.compliance,
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4 md:p-5">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium text-foreground">
            Step {step} of {TOTAL_STEPS}
          </p>
          <p className="text-muted-foreground">{STEP_LABELS[step]}</p>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {step === 1 && (
        <ClinicDetailsStep
          clinicForm={clinicForm}
          onSubmit={setClinicDetails}
        />
      )}

      {step === 2 && (
        <PlanSelectionStep
          currency="INR"
          defaultTier={formData.planSelection.tier}
          defaultBillingCycle={formData.planSelection.billingCycle}
          defaultIsCoreTrial={formData.planSelection.isCoreTrial}
          onSelect={(tier, billingCycle, pricing, options) =>
            setPlanSelection(
              tier,
              billingCycle,
              pricing as PlanSelection["billingCycle"] extends
                | "MONTHLY"
                | "YEARLY"
                ? { monthly: number | "custom"; yearly: number | "custom" }
                : never,
              options,
            )
          }
        />
      )}

      {step === 3 && (
        <TeamInviteStep
          onSkip={() => setStep(4)}
          onComplete={setTeamMembers}
          ownerName={user?.name}
          ownerEmail={user?.email}
          ownerRole={user?.role === "ADMIN_DOCTOR" ? "ADMIN_DOCTOR" : "ADMIN"}
        />
      )}

      {step === 4 && (
        <ComplianceStep
          complianceForm={complianceForm}
          onBack={goBackFromCompliance}
          onSubmit={complianceForm.handleSubmit((data: ComplianceSettings) =>
            submitRegistration(data, onSuccess),
          )}
          onUploadSlaSignature={uploadSlaSignature}
        />
      )}
    </div>
  );
}
