"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { getUserFacingErrorMessage } from "@workspace/types";
import { useClinicRegistrationFlow } from "@/features/onboarding/hooks/use-clinic-registration-flow";
import { useAuth } from "@/lib/auth-context";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { WhatsAppButton } from "@/features/_shared/components/whatsapp/whatsapp-button";
import {
  ClinicDetailsStep,
  ComplianceStep,
  PlanSelectionStep,
  TeamInviteStep,
} from "@/features/onboarding/components/steps";
import { PaymentStep } from "@/features/onboarding/components/steps/PaymentStep";
import {
  type ClinicDetails,
  clinicDetailsSchema,
  complianceSchema,
  type ComplianceSettings,
  defaultComplianceValues,
  type PlanSelection,
} from "@/features/onboarding/components/types";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

const STEPS = [
  { number: 1, label: "Clinic Details", estimatedTime: "2 min" },
  { number: 2, label: "Choose Plan", estimatedTime: "3 min" },
  { number: 3, label: "Invite Team", estimatedTime: "2 min" },
  { number: 4, label: "Compliance", estimatedTime: "3 min" },
];

const TOTAL_STEPS = 4;
const DRAFT_KEY = "docita_onboarding_draft";
const SESSION_ONBOARDING_ID_KEY = "docita_onboarding_id";
interface OnboardingDraft {
  clinicDetails: Partial<ClinicDetails>;
  savedAt: string;
  onboardingId?: string | null;
}

function hasMeaningfulClinicDraftData(
  clinicDetails: Partial<ClinicDetails> | undefined,
): boolean {
  if (!clinicDetails) return false;

  return Object.values(clinicDetails).some((value) => {
    if (typeof value === "string") return value.trim().length > 0;
    return value !== undefined && value !== null;
  });
}

function getMissingClinicDetailsForProgress(
  clinicDetails: Partial<ClinicDetails> | undefined,
): string[] {
  const missing: string[] = [];
  if (!clinicDetails?.name?.trim()) missing.push("clinic name");
  if (!clinicDetails?.email?.trim()) missing.push("clinic email");
  if (!clinicDetails?.phone?.trim()) missing.push("clinic phone");
  if (!clinicDetails?.address?.trim()) missing.push("clinic address");
  if (!clinicDetails?.type) missing.push("clinic type");
  return missing;
}

export function ClinicRegistrationForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const { currency } = useLocaleCurrency();
  const supportPhone = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER;
  const supportMessage =
    "Hi Docita team, I need help with clinic onboarding and pricing for my hospital.";
  const [stepError, setStepError] = useState<string | null>(null);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [savedDraft, setSavedDraft] = useState<OnboardingDraft | null>(null);
  const [pendingPaymentPlan, setPendingPaymentPlan] = useState<{
    tier: string;
    billingCycle: "MONTHLY" | "YEARLY";
    pricing: { monthly: number | "custom"; yearly: number | "custom" };
  } | null>(null);

  const {
    step,
    formData,
    onboardingId,
    restoreOnboardingId,
    ensureOnboardingId,
    restartOnboarding,
    setClinicDetails,
    setPlanSelection,
    setTeamMembers,
    goBackFromCompliance,
    submitRegistration,
  } = useClinicRegistrationFlow();

  const clinicForm = useForm<ClinicDetails>({
    resolver: zodResolver(clinicDetailsSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    criteriaMode: "all",
    shouldFocusError: true,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      website: "",
      gstin: "",
      ...(formData.clinicDetails as Partial<ClinicDetails>),
    } as ClinicDetails,
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

  // Check for saved draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as OnboardingDraft;
      const currentOnboardingId =
        typeof sessionStorage !== "undefined"
          ? sessionStorage.getItem(SESSION_ONBOARDING_ID_KEY)
          : null;
      const persistedStep =
        typeof sessionStorage !== "undefined"
          ? Number(sessionStorage.getItem("docita_onboarding_step") || "1")
          : 1;
      const ageMs = Date.now() - new Date(draft.savedAt).getTime();
      const hasMeaningfulDraft =
        hasMeaningfulClinicDraftData(draft.clinicDetails) ||
        Boolean(draft.onboardingId);
      const isSameOnboardingSession =
        Boolean(draft.onboardingId) &&
        draft.onboardingId === currentOnboardingId;
      const hasActiveSessionProgress =
        Boolean(currentOnboardingId) && persistedStep > 1;

      if (
        ageMs < 24 * 60 * 60 * 1000 &&
        hasMeaningfulDraft &&
        !isSameOnboardingSession &&
        !hasActiveSessionProgress
      ) {
        setSavedDraft(draft);
        setShowDraftDialog(true);
      } else if (
        ageMs < 24 * 60 * 60 * 1000 &&
        hasMeaningfulDraft &&
        (isSameOnboardingSession || hasActiveSessionProgress)
      ) {
        // Same onboarding session after refresh: restore silently without showing prompt.
        clinicForm.reset(draft.clinicDetails as ClinicDetails);
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // Ignore parse errors
    }
  }, [clinicForm]);

  const handleRestoreDraft = () => {
    if (savedDraft?.clinicDetails) {
      clinicForm.reset(savedDraft.clinicDetails as ClinicDetails);
    }
    if (savedDraft?.onboardingId) {
      restoreOnboardingId(savedDraft.onboardingId);
    }
    setShowDraftDialog(false);
    setSavedDraft(null);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftDialog(false);
    setSavedDraft(null);
  };

  const handleSetClinicDetails = (data: ClinicDetails) => {
    setStepError(null);
    setClinicDetails(data);
  };

  const handleSetPlanSelection = async (
    tier: string,
    billingCycle: "MONTHLY" | "YEARLY",
    pricing: { monthly: number | "custom"; yearly: number | "custom" },
    options?: { isCoreTrial?: boolean; currency?: string },
  ) => {
    setStepError(null);

    // For paid Essential plans without trial, show PaymentStep before Razorpay
    const price = billingCycle === "YEARLY" ? pricing.yearly : pricing.monthly;
    const clinicGstin = clinicForm.getValues("gstin");
    const isIndianCurrency = currency === "INR";
    const isPaidPlan = typeof price === "number" && price > 0;

    if (isIndianCurrency && isPaidPlan && !options?.isCoreTrial && !clinicGstin?.trim()) {
      setStepError(
        "Add your GSTIN in Clinic Details before charging a paid Indian plan. We need it for GST invoices.",
      );
      return;
    }

    if (
      tier === "ESSENTIAL" &&
      !options?.isCoreTrial &&
      isPaidPlan
    ) {
      setPendingPaymentPlan({ tier, billingCycle, pricing });
      return;
    }

    try {
      await setPlanSelection(
        tier,
        billingCycle,
        pricing as PlanSelection["billingCycle"] extends "MONTHLY" | "YEARLY"
          ? { monthly: number | "custom"; yearly: number | "custom" }
          : never,
        { ...options, currency },
      );
    } catch (error) {
      setStepError(
        getUserFacingErrorMessage(error, {
          fallback: "We could not continue with this plan. Please try again.",
          context: "save",
        }),
      );
    }
  };

  const handleStartTrial = async () => {
    if (!pendingPaymentPlan) return;
    const { tier, billingCycle, pricing } = pendingPaymentPlan;
    setPendingPaymentPlan(null);
    await handleSetPlanSelection(tier, billingCycle, pricing, {
      isCoreTrial: true,
    });
  };

  const handleSetTeamMembers = async (members: Parameters<typeof setTeamMembers>[0]) => {
    setStepError(null);
    try {
      await setTeamMembers(members);
    } catch (error) {
      setStepError(
        getUserFacingErrorMessage(error, {
          fallback: "We could not continue onboarding. Please try again.",
          context: "save",
        }),
      );
    }
  };

  const handleSkipTeamStep = async () => {
    setStepError(null);
    try {
      await setTeamMembers([]);
    } catch (error) {
      setStepError(
        getUserFacingErrorMessage(error, {
          fallback: "We could not continue onboarding. Please try again.",
          context: "save",
        }),
      );
    }
  };

  const handleSubmitRegistration = async (
    data: ComplianceSettings,
    successCallback: () => void,
  ) => {
    setStepError(null);
    try {
      await submitRegistration(data, successCallback);
    } catch {
      setStepError(
        "We could not complete registration. Please check your details and try again.",
      );
    }
  };

  // Auto-save clinic details to localStorage as user types
  const persistDraft = useCallback(
    (clinicDetails: Partial<ClinicDetails>) => {
      try {
        const draft: OnboardingDraft = {
          clinicDetails,
          savedAt: new Date().toISOString(),
          onboardingId,
        };

        const hasMeaningfulDraft =
          hasMeaningfulClinicDraftData(clinicDetails) || Boolean(onboardingId);
        if (!hasMeaningfulDraft) {
          localStorage.removeItem(DRAFT_KEY);
          return;
        }

        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Storage quota exceeded or unavailable
      }
    },
    [onboardingId],
  );

  useEffect(() => {
    const subscription = clinicForm.watch((values) => {
      persistDraft(values);
    });
    return () => subscription.unsubscribe();
  }, [clinicForm, persistDraft]);

  useEffect(() => {
    persistDraft(clinicForm.getValues());
  }, [clinicForm, onboardingId, persistDraft]);

  useEffect(() => {
    if (step <= 1) return;
    const missingClinicData = getMissingClinicDetailsForProgress(
      formData.clinicDetails,
    );
    if (missingClinicData.length === 0) return;

    restartOnboarding();
    setPendingPaymentPlan(null);
    localStorage.removeItem(DRAFT_KEY);
    setSavedDraft(null);
    setShowDraftDialog(false);
    setStepError(
      `Onboarding progress was incomplete (${missingClinicData.join(", ")}). Started over from Step 1.`,
    );
  }, [formData.clinicDetails, restartOnboarding, step]);

  const currentStep = STEPS.find((s) => s.number === step) ?? STEPS[0];
  const progressPercent = Math.round((step / TOTAL_STEPS) * 100);



  return (
    <div className="space-y-6">
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Continue where you left off?</DialogTitle>
            <DialogDescription>
              A saved draft was found from{" "}
              {savedDraft ? new Date(savedDraft.savedAt).toLocaleString() : "earlier"}.
              Would you like to restore it?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDiscardDraft}>
              Start Fresh
            </Button>
            <Button onClick={handleRestoreDraft}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {stepError && (
        <Alert
          variant="destructive"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{stepError}</span>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setStepError(null)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {stepError ? `Error: ${stepError}` : ""}
      </div>

      <div className="rounded-xl border bg-card p-4 md:p-5">
        <div className="flex items-center justify-between text-sm mb-3">
          <p className="font-medium text-foreground">
            Step {step} of {TOTAL_STEPS}: {currentStep.label}
          </p>
          <p className="text-muted-foreground text-xs">
            ~{currentStep.estimatedTime} remaining
          </p>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Onboarding progress: ${progressPercent}%`}
          />
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((s) => (
            <span
              key={s.number}
              className={`text-xs ${s.number === step ? "font-semibold text-primary" : s.number < step ? "text-muted-foreground" : "text-muted-foreground/50"}`}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {step === 1 && (
        <ClinicDetailsStep
          clinicForm={clinicForm}
          onSubmit={handleSetClinicDetails}
        />
      )}

      {step === 2 && !pendingPaymentPlan && (
        <PlanSelectionStep
          currency={currency}
          defaultTier={formData.planSelection.tier}
          defaultBillingCycle={formData.planSelection.billingCycle}
          defaultIsCoreTrial={formData.planSelection.isCoreTrial}
          onSelect={handleSetPlanSelection}
        />
      )}

      {step === 2 && pendingPaymentPlan && (
        <PaymentStep
          selectedPlanPrice={
            pendingPaymentPlan.billingCycle === "YEARLY"
              ? typeof pendingPaymentPlan.pricing.yearly === "number"
                ? pendingPaymentPlan.pricing.yearly
                : 0
              : typeof pendingPaymentPlan.pricing.monthly === "number"
                ? pendingPaymentPlan.pricing.monthly
                : 0
          }
          billingCycle={pendingPaymentPlan.billingCycle}
          currencySymbol={
            currency === "USD" ? "$"
            : currency === "EUR" ? "€"
            : currency === "GBP" ? "£"
            : currency === "AUD" ? "A$"
            : "₹"
          }
          currencyCode={currency}
          clinicEmail={user?.email}
          clinicPhone={formData.clinicDetails.phone}
          tier={pendingPaymentPlan.tier}
          onStartTrial={handleStartTrial}
          onBack={() => setPendingPaymentPlan(null)}
          onComplete={async () => {
            setPendingPaymentPlan(null);
            await handleSetPlanSelection(
              pendingPaymentPlan.tier,
              pendingPaymentPlan.billingCycle,
              pendingPaymentPlan.pricing,
            );
          }}
        />
      )}

      {step === 3 && (
        <TeamInviteStep
          onSkip={handleSkipTeamStep}
          onComplete={handleSetTeamMembers}
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
            handleSubmitRegistration(data, onSuccess),
          )}
          onboardingId={onboardingId ?? undefined}
          ensureOnboardingId={ensureOnboardingId}
        />
      )}

      <div className="rounded-xl border bg-muted/30 p-4 md:p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="font-semibold">Need hand-holding?</p>
          <p className="text-sm text-muted-foreground">
            We support onboarding, reminders, and follow-up over WhatsApp.
            Reach us directly if you want a guided setup.
          </p>
        </div>
        <WhatsAppButton
          phoneNumber={supportPhone}
          message={supportMessage}
          label="Message onboarding team"
          variant="default"
          allowGenericLink
        />
      </div>
    </div>
  );
}
