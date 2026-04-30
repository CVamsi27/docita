"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useAPIQuery, useAPIMutation } from "@/lib/api-core";
import { useGenerateSignatureToken } from "@/hooks/api/use-signature-upload";
import { ApiError } from "@/lib/errors";
import {
  sanitizeUserFacingMessage,
  type Clinic,
  type User,
} from "@workspace/types";
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";
import { toAbsoluteApiUrl, toAbsoluteAppUrl } from "@/lib/url";
import { usePhoneSignatureQrFlow } from "@/features/_shared/hooks/use-phone-signature-qr-flow";
import { PhoneSignatureQrPanel } from "@/features/_shared/components/signature/phone-signature-qr-panel";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";

export default function VerifyDoctorPage() {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registrationError, setRegistrationError] = useState<string | null>(
    null,
  );
  const [isSavingReg, setIsSavingReg] = useState(false);
  const [isApplyingOnboardingSignature, setIsApplyingOnboardingSignature] =
    useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isDoctor = user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR";
  const isAdminDoctor = user?.role === "ADMIN_DOCTOR";
  const generateSignatureToken = useGenerateSignatureToken();

  const {
    data: doctorProfile,
    isLoading: profileLoading,
    refetch,
  } = useAPIQuery<User>(
    ["doctor-profile", user?.id ?? ""],
    `/doctors/${user?.id}`,
    { enabled: !!user?.id && isDoctor },
  );
  const { data: clinic, isLoading: clinicLoading } = useAPIQuery<Clinic>(
    ["clinic-settings", user?.clinicId ?? ""],
    "/clinic/settings",
    { enabled: !!user?.clinicId && isDoctor },
  );

  const updateDoctorRegistration = useAPIMutation<
    User,
    { registrationNumber: string }
  >(`/doctors/${user?.id}/registration-number`, "PUT", {
    invalidateKeys: [["doctor-profile", user?.id ?? ""]],
  });
  const updateDoctorSignature = useAPIMutation<User, { signatureUrl: string }>(
    `/doctors/${user?.id}`,
    "PUT",
    { invalidateKeys: [["doctor-profile", user?.id ?? ""]] },
  );

  const profile = doctorProfile ?? user;
  const hasSignature = !!profile?.signatureUrl;
  const hasSavedRegistration = !!profile?.registrationNumber;
  const hasDraftRegistration = registrationNumber.trim().length > 0;
  const hasRegistrationProgress = hasSavedRegistration || hasDraftRegistration;
  const canContinue = hasSignature && hasRegistrationProgress;
  const onboardingSignatureUrl = clinic?.slaSignatureUrl ?? null;
  const onboardingSignatureStoredUrl = clinic?.slaSignatureStoredUrl ?? null;
  const onboardingSignatureSourceUrl =
    onboardingSignatureStoredUrl ?? onboardingSignatureUrl;
  const resolvedOnboardingSignatureUrl = onboardingSignatureSourceUrl
    ? toAbsoluteApiUrl(onboardingSignatureSourceUrl)
    : null;
  const resolvedProfileSignatureUrl = profile?.signatureUrl
    ? toAbsoluteApiUrl(profile.signatureUrl)
    : null;
  const canUseOnboardingSignature =
    isAdminDoctor && Boolean(onboardingSignatureSourceUrl) && !hasSignature;
  const shouldDeferQrAutoStart = isAdminDoctor && clinicLoading;

  const createSignatureSession = useCallback(async () => {
    const token = await generateSignatureToken.mutateAsync();
    return {
      sessionId: token.token,
      qrUrl: toAbsoluteAppUrl(token.uploadUrl),
    };
  }, [generateSignatureToken]);

  const checkSignatureUploaded = useCallback(async () => {
    const result = await refetch();
    const refreshedProfile = result.data ?? doctorProfile ?? user;
    return Boolean(refreshedProfile?.signatureUrl);
  }, [doctorProfile, refetch, user]);

  const signatureQrFlow = usePhoneSignatureQrFlow({
    createSession: createSignatureSession,
    checkUploaded: checkSignatureUploaded,
    onUploaded: () => {
      toast.success("Signature received from your phone");
    },
    persistenceKey: `docita_verify_doctor_qr_session_${user?.id ?? "anonymous"}`,
    autoStart:
      !hasSignature && !canUseOnboardingSignature && !shouldDeferQrAutoStart,
    initialUploaded: hasSignature,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsRedirecting(true);
      router.replace("/login?next=/verify-doctor");
      return;
    }

    if (!isDoctor) {
      setIsRedirecting(true);
      router.replace("/dashboard");
      return;
    }

    if (canContinue) {
      setIsRedirecting(true);
      router.replace("/dashboard");
    }
  }, [authLoading, user, isDoctor, canContinue, router]);

  const handleUseOnboardingSignature = async () => {
    if (!onboardingSignatureSourceUrl) return;

    setIsApplyingOnboardingSignature(true);
    try {
      await updateDoctorSignature.mutateAsync({
        signatureUrl: onboardingSignatureSourceUrl,
      });
      toast.success("Onboarding signature added to your profile");
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not use the signature uploaded during onboarding. Please try again.",
        "save",
      );
    } finally {
      setIsApplyingOnboardingSignature(false);
    }
  };

  const handleSaveRegistration = async (): Promise<boolean> => {
    if (!registrationNumber.trim()) return false;
    setIsSavingReg(true);
    setRegistrationError(null);
    try {
      await updateDoctorRegistration.mutateAsync({
        registrationNumber: registrationNumber.trim(),
      });
      await refetch();
      toast.success("Registration number saved");
      setRegistrationNumber("");
      return true;
    } catch (error) {
      if (error instanceof ApiError) {
        const validationErrors = error.details?.validationErrors;
        if (
          validationErrors &&
          typeof validationErrors === "object" &&
          !Array.isArray(validationErrors)
        ) {
          const fieldErrors = validationErrors as Record<string, unknown>;
          const registrationFieldError = fieldErrors.registrationNumber;
          if (
            typeof registrationFieldError === "string" &&
            registrationFieldError.length > 0
          ) {
            const safeMessage = sanitizeUserFacingMessage(
              registrationFieldError,
              "Please check the registration number",
            );
            setRegistrationError(safeMessage);
            showUserFacingErrorToast(null, safeMessage, "form");
            return false;
          }

          const firstFieldError = Object.values(fieldErrors).find(
            (value): value is string =>
              typeof value === "string" && value.length > 0,
          );
          if (firstFieldError) {
            const safeMessage = sanitizeUserFacingMessage(
              firstFieldError,
              "Please check the registration number",
            );
            setRegistrationError(safeMessage);
            showUserFacingErrorToast(null, safeMessage, "form");
            return false;
          }
        }
      }

      showUserFacingErrorToast(
        error,
        "We could not save this registration number. Please try again.",
        "save",
      );
      return false;
    } finally {
      setIsSavingReg(false);
    }
  };

  const handleContinue = async () => {
    if (!hasSignature) return;
    if (!hasSavedRegistration && !registrationNumber.trim()) {
      setRegistrationError("Please enter your registration number");
      return;
    }

    try {
      if (!hasSavedRegistration) {
        const saved = await handleSaveRegistration();
        if (!saved) return;
      }

      setIsRedirecting(true);
      await refreshUser();
      router.replace("/dashboard");
    } catch {
      setIsRedirecting(false);
      showUserFacingErrorToast(
        "We could not finish this verification step. Please try again.",
      );
    }
  };

  if (isRedirecting) {
    return (
      <PageTransitionLoader
        title="Redirecting to dashboard..."
        description="Finalizing your verification state"
      />
    );
  }

  if (
    authLoading ||
    (user?.id && isDoctor && profileLoading && !doctorProfile) ||
    !user ||
    !isDoctor ||
    canContinue
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const steps = [
    {
      label: "Upload Digital Signature",
      description: "Required to generate prescriptions and medical documents",
      done: hasSignature,
      required: true,
    },
    {
      label: "Medical Registration Number",
      description: "Your council registration number for verification",
      done: hasRegistrationProgress,
      required: true,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <PreDashboardShell currentStep="verify-doctor" contentMaxWidth="max-w-lg">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-normal">
            Profile Verification
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Complete your profile before accessing the dashboard. This ensures
          patient safety and regulatory compliance.
        </p>
      </div>

      <div
        className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "100ms" }}
      >
        <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-4 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Setup Progress</span>
            <span className="text-xs text-muted-foreground">
              {completedCount} of {steps.filter((s) => s.required).length}
              <span className="ml-1">required</span>
            </span>
          </div>
          <div className="space-y-2">
            {steps.map((step) => (
              <div key={step.label} className="flex items-start gap-3">
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${step.done ? "text-primary" : ""}`}
                  >
                    {step.label}
                    {step.required && !step.done && (
                      <span className="ml-1 text-xs font-normal text-destructive">
                        Required
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-5 shadow-md space-y-3">
          <div className="flex items-center gap-2">
            {hasSignature ? (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
            <h2 className="font-semibold text-sm">
              Step 1: Upload Your Signature
            </h2>
          </div>
          {hasSignature ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Signature uploaded successfully.
              </div>
              {resolvedProfileSignatureUrl && (
                <div className="rounded-lg border bg-background p-4 flex items-center justify-center min-h-[100px]">
                  <img
                    src={resolvedProfileSignatureUrl}
                    alt="Your uploaded signature"
                    className="max-h-24 max-w-full object-contain"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                This signature will appear on prescriptions and medical
                documents.
                <a
                  href="/settings?tab=doctor-profile"
                  className="ml-1 text-primary underline-offset-2 hover:underline"
                >
                  Re-upload in Settings
                </a>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {canUseOnboardingSignature && resolvedOnboardingSignatureUrl && (
                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary">
                        Signature uploaded during onboarding
                      </p>
                      <p className="text-xs text-muted-foreground">
                        You can reuse the same signature for your doctor
                        profile.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center rounded-lg border bg-background p-4 min-h-[100px]">
                    <img
                      src={resolvedOnboardingSignatureUrl}
                      alt="Onboarding signature preview"
                      className="max-h-24 max-w-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => void handleUseOnboardingSignature()}
                      disabled={
                        isApplyingOnboardingSignature ||
                        signatureQrFlow.isLoading
                      }
                    >
                      {isApplyingOnboardingSignature ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        "Use onboarding signature"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => void signatureQrFlow.retrySession()}
                      disabled={
                        isApplyingOnboardingSignature ||
                        signatureQrFlow.isLoading
                      }
                    >
                      Use a different signature
                    </Button>
                  </div>
                </div>
              )}
              {(!canUseOnboardingSignature ||
                signatureQrFlow.session ||
                signatureQrFlow.isLoading ||
                signatureQrFlow.error) && (
                <PhoneSignatureQrPanel
                  loading={signatureQrFlow.isLoading}
                  uploaded={signatureQrFlow.isUploaded}
                  polling={signatureQrFlow.isPolling}
                  error={signatureQrFlow.error}
                  qrUrl={signatureQrFlow.session?.qrUrl ?? null}
                  onRetry={() => {
                    void signatureQrFlow.retrySession();
                  }}
                  onRefreshStatus={async () => {
                    try {
                      const synced = await signatureQrFlow.refreshStatus();
                      if (synced) {
                        toast.success("Signature synced");
                      } else {
                        toast.message(
                          "We have not received the signature yet",
                        );
                      }
                    } catch {
                      showUserFacingErrorToast(
                        "We could not refresh signature status. Please try again.",
                      );
                    }
                  }}
                  onCopyLink={async () => {
                    try {
                      const copied = await signatureQrFlow.copyLink();
                      if (copied) {
                        toast.success("Link copied");
                      } else {
                        showUserFacingErrorToast(
                          "We could not copy this link. Please try again.",
                        );
                      }
                    } catch {
                      showUserFacingErrorToast(
                        "We could not copy this link. Please try again.",
                      );
                    }
                  }}
                  successTitle="Signature uploaded successfully"
                  successDescription="Your signature has been saved and verified"
                />
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-5 shadow-md space-y-3">
          <div className="flex items-center gap-2">
            {hasRegistrationProgress ? (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
            <h2 className="font-semibold text-sm">
              Step 2: Medical Registration Number
            </h2>
          </div>
          {hasSavedRegistration ? (
            <p className="text-sm text-muted-foreground">
              Saved:
              <span className="ml-1 font-medium text-foreground">
                {profile?.registrationNumber}
              </span>
            </p>
          ) : (
            <div className="space-y-2">
              <Label
                htmlFor="registration-number"
                className="text-xs text-muted-foreground"
              >
                Enter your medical council registration number
              </Label>
              <div className="relative">
                <Input
                  id="registration-number"
                  placeholder="e.g. MH-12345"
                  value={registrationNumber}
                  onChange={(e) => {
                    setRegistrationNumber(e.target.value);
                    if (registrationError) {
                      setRegistrationError(null);
                    }
                  }}
                  onBlur={() => {
                    if (!registrationNumber.trim() || isSavingReg) return;
                    void handleSaveRegistration();
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    if (!registrationNumber.trim() || isSavingReg) return;
                    void handleSaveRegistration();
                  }}
                  aria-invalid={registrationError ? true : false}
                  className={`pr-10 ${registrationError ? "border-destructive focus-visible:ring-destructive/40" : ""}`}
                />
                {isSavingReg ? (
                  <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Press Enter or click outside the field to save.
              </p>
              {registrationError && (
                <p className="text-xs text-destructive">{registrationError}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Button
            className="w-full h-11"
            disabled={!canContinue || isSavingReg}
            onClick={handleContinue}
          >
            {!hasSavedRegistration && hasDraftRegistration
              ? "Register and Continue"
              : "Continue to Dashboard"}
          </Button>
          {!canContinue && (
            <p className="text-center text-xs text-muted-foreground">
              Complete all required steps to continue.
            </p>
          )}
        </div>
      </div>
    </PreDashboardShell>
  );
}
