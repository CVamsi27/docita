import PageContent from "@/features/onboarding/components/VerifyDoctorPageContent";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { useAPIQuery, useAPIMutation } from "@/lib/api/api-core";
import { useGenerateSignatureToken } from "@/hooks/api/use-signature-upload";
import { ApiError } from "@/lib/errors";
import {
  sanitizeUserFacingMessage,
  type Clinic,
  type UpdateDoctorRegistrationRequest,
  type User,
} from "@workspace/types";
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";
import { toAbsoluteApiUrl, toAbsoluteAppUrl } from "@/lib/url";
import { usePhoneSignatureQrFlow } from "@/features/_shared/hooks/use-phone-signature-qr-flow";
import { PhoneSignatureQrPanel } from "@/features/_shared/components/signature/phone-signature-qr-panel";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";
import { shouldRedirectToWorkspace } from "./redirect-logic";

export default function VerifyDoctorPage() {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registrationCouncil, setRegistrationCouncil] = useState("");
  const [registrationStateCode, setRegistrationStateCode] = useState("");
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
    UpdateDoctorRegistrationRequest
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

  useEffect(() => {
    if (!doctorProfile) return;
    setRegistrationCouncil(doctorProfile.registrationCouncil ?? "");
    setRegistrationStateCode(doctorProfile.registrationStateCode ?? "");
  }, [doctorProfile]);
  const hasSavedRegistration = !!profile?.registrationNumber;
  const hasDraftRegistration = registrationNumber.trim().length > 0;
  const hasRegistrationProgress = hasSavedRegistration || hasDraftRegistration;
  const canContinue = hasSignature && hasRegistrationProgress;
  const canAutoRedirect = shouldRedirectToWorkspace(
    hasSignature,
    hasSavedRegistration,
  );
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
      router.replace("/today");
      return;
    }

    if (canAutoRedirect) {
      setIsRedirecting(true);
      router.replace("/today");
    }
  }, [authLoading, user, isDoctor, canAutoRedirect, router]);

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
      const payload: UpdateDoctorRegistrationRequest = {
        registrationNumber: registrationNumber.trim(),
      };
      const council = registrationCouncil.trim();
      const region = registrationStateCode.trim();
      if (council) payload.registrationCouncil = council;
      if (region) payload.registrationStateCode = region;

      await updateDoctorRegistration.mutateAsync(payload);
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
      router.replace("/today");
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
        title="Redirecting to your workspace…"
        description="Finalizing your verification state"
      />
    );
  }

  if (
    authLoading ||
    (user?.id && isDoctor && profileLoading && !doctorProfile) ||
    !user ||
    !isDoctor ||
    canAutoRedirect
  ) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background px-4"
        role="status"
        aria-live="polite"
        aria-label="Loading doctor verification"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-10 w-10 text-muted-foreground"
        />
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
      description:
        "Registration number and jurisdiction details for council verification",
      done: hasRegistrationProgress,
      required: true,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <PreDashboardShell currentStep="verify-doctor" contentMaxWidth="max-w-lg">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="ui-page-title">Profile Verification</h1>
        </div>
        <p className="ui-page-subtitle">
          Complete your profile before accessing your workspace. This ensures
          patient safety and regulatory compliance.
        </p>
      </div>

      <div className="space-y-4">
        <div className="ui-card-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="ui-section-title text-[var(--fs-sm)]">
              Setup Progress
            </span>
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

        <div className="ui-card-surface space-y-3 p-5">
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
                          <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
                          Applying…
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

        <div className="ui-card-surface space-y-3 p-5">
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
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Saved:
                <span className="ml-1 font-medium text-foreground">
                  {profile?.registrationNumber}
                </span>
              </p>
              {(profile?.registrationCouncil || profile?.registrationStateCode) && (
                <p className="text-xs">
                  {profile?.registrationCouncil ? (
                    <>
                      Council:
                      <span className="ml-1 font-medium text-foreground">
                        {profile.registrationCouncil}
                      </span>
                    </>
                  ) : null}
                  {profile?.registrationStateCode ? (
                    <>
                      <span className={profile?.registrationCouncil ? " ml-2" : ""}>
                        Region:
                        <span className="ml-1 font-medium text-foreground">
                          {profile.registrationStateCode}
                        </span>
                      </span>
                    </>
                  ) : null}
                </p>
              )}
              <p className="text-xs">
                Verification timing depends on your council. You can continue once
                your registration number is saved.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label
                  htmlFor="registration-number"
                  className="text-xs text-muted-foreground"
                >
                  Medical council registration number
                </Label>
                <div className="relative">
                  <Input
                    id="registration-number"
                    placeholder="Registration number"
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
                    <DocitaLoadingIndicator variant="inline" decorative className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                  ) : null}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="registration-council"
                    className="text-xs text-muted-foreground"
                  >
                    Issuing council (optional)
                  </Label>
                  <Input
                    id="registration-council"
                    placeholder="Medical council"
                    value={registrationCouncil}
                    onChange={(e) => setRegistrationCouncil(e.target.value)}
                    onBlur={() => {
                      if (!registrationNumber.trim() || isSavingReg) return;
                      void handleSaveRegistration();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="registration-region"
                    className="text-xs text-muted-foreground"
                  >
                    Region code (optional)
                  </Label>
                  <Input
                    id="registration-region"
                    placeholder="State code"
                    value={registrationStateCode}
                    onChange={(e) => setRegistrationStateCode(e.target.value)}
                    onBlur={() => {
                      if (!registrationNumber.trim() || isSavingReg) return;
                      void handleSaveRegistration();
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Save runs when you leave the registration number field or press
                Enter there. Optional fields are sent with the same save.
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
              ? "Register and continue"
              : "Continue to your workspace"}
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
