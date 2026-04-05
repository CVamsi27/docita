'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useAPIQuery, useAPIMutation } from '@/lib/api-core';
import { useGenerateSignatureToken } from '@/hooks/api/use-signature-upload';
import { ApiError } from '@/lib/errors';
import type { User } from '@workspace/types';
import { ThemeToggle } from '@workspace/ui/components/theme-toggle';
import { DocitaLogo } from '@workspace/ui/components/docita-logo';
import { PageTransitionLoader } from '@/components/common/loaders/page-transition-loader';
import { toAbsoluteAppUrl } from '@/lib/url';
import { usePhoneSignatureQrFlow } from '@/features/_shared/hooks/use-phone-signature-qr-flow';
import { PhoneSignatureQrPanel } from '@/features/_shared/components/signature/phone-signature-qr-panel';

export default function VerifyDoctorPage() {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isSavingReg, setIsSavingReg] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isDoctor = user?.role === 'DOCTOR' || user?.role === 'ADMIN_DOCTOR';
  const generateSignatureToken = useGenerateSignatureToken();

  const { data: doctorProfile, isLoading: profileLoading, refetch } = useAPIQuery<User>(
    ['doctor-profile', user?.id ?? ''],
    `/doctors/${user?.id}`,
    { enabled: !!user?.id && isDoctor },
  );

  const updateDoctor = useAPIMutation<User, { registrationNumber: string }>(
    `/doctors/${user?.id}/registration-number`,
    'PUT',
    { invalidateKeys: [['doctor-profile', user?.id ?? '']] },
  );

  const profile = doctorProfile ?? user;
  const hasSignature = !!profile?.signatureUrl;
  const hasRegistration = !!profile?.registrationNumber;
  const canContinue = hasSignature && hasRegistration;
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
      toast.success('Signature received from your phone.');
    },
    persistenceKey: `docita_verify_doctor_qr_session_${user?.id ?? "anonymous"}`,
    autoStart: !hasSignature,
    initialUploaded: hasSignature,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsRedirecting(true);
      router.replace('/login?next=/verify-doctor');
      return;
    }

    if (!isDoctor) {
      setIsRedirecting(true);
      router.replace('/dashboard');
      return;
    }

    if (canContinue) {
      setIsRedirecting(true);
      router.replace('/dashboard');
    }
  }, [authLoading, user, isDoctor, canContinue, router]);

  const handleSaveRegistration = async () => {
    if (!registrationNumber.trim()) return;
    setIsSavingReg(true);
    setRegistrationError(null);
    try {
      await updateDoctor.mutateAsync({ registrationNumber: registrationNumber.trim() });
      await refetch();
      toast.success('Registration number saved.');
      setRegistrationNumber('');
    } catch (error) {
      if (error instanceof ApiError) {
        const validationErrors = error.details?.validationErrors;
        if (validationErrors && typeof validationErrors === 'object' && !Array.isArray(validationErrors)) {
          const fieldErrors = validationErrors as Record<string, unknown>;
          const registrationFieldError = fieldErrors.registrationNumber;
          if (typeof registrationFieldError === 'string' && registrationFieldError.length > 0) {
            setRegistrationError(registrationFieldError);
            toast.error(registrationFieldError);
            return;
          }

          const firstFieldError = Object.values(fieldErrors).find(
            (value): value is string =>
              typeof value === 'string' && value.length > 0,
          );
          if (firstFieldError) {
            setRegistrationError(firstFieldError);
            toast.error(firstFieldError);
            return;
          }
        }
      }

      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save registration number.',
      );
    } finally {
      setIsSavingReg(false);
    }
  };

  const handleContinue = async () => {
    setIsRedirecting(true);
    try {
      await refreshUser();
      router.replace('/dashboard');
    } catch {
      setIsRedirecting(false);
      toast.error('Unable to continue right now. Please try again.');
    }
  };

  if (isRedirecting) {
    return (
      <PageTransitionLoader
        title="Redirecting to dashboard..."
        description="Finalizing your verification state."
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
      label: 'Upload Digital Signature',
      description: 'Required to generate prescriptions and medical documents.',
      done: hasSignature,
      required: true,
    },
    {
      label: 'Medical Registration Number',
      description: 'Your council registration number for verification.',
      done: hasRegistration,
      required: true,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <div className="flex h-10 items-center">
          <DocitaLogo />
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Profile Verification</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Complete your profile before accessing the dashboard. This ensures
              patient safety and regulatory compliance.
            </p>
          </div>

          {/* Progress */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Setup Progress</span>
              <span className="text-xs text-muted-foreground">
                {completedCount} of {steps.filter((s) => s.required).length} required
              </span>
            </div>
            <div className="space-y-2">
              {steps.map((step) => (
                <div key={step.label} className="flex items-start gap-3">
                  {step.done ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-primary mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="h-4.5 w-4.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${step.done ? 'text-primary' : ''}`}>
                      {step.label}
                      {step.required && !step.done && (
                        <span className="ml-1 text-xs font-normal text-destructive">Required</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Signature */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              {hasSignature ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <h2 className="font-semibold text-sm">Step 1: Upload Your Signature</h2>
            </div>
            {hasSignature ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Signature uploaded successfully.
                </div>
                {profile?.signatureUrl && (
                  <div className="rounded-lg border bg-white p-4 flex items-center justify-center min-h-[100px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profile.signatureUrl}
                      alt="Your uploaded signature"
                      className="max-h-24 max-w-full object-contain"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  This signature will appear on prescriptions and medical documents.{' '}
                  <a href="/settings?tab=doctor-profile" className="text-primary underline-offset-2 hover:underline">
                    Re-upload in Settings
                  </a>
                </p>
              </div>
            ) : (
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
                      toast.success('Signature synced');
                    } else {
                      toast.message('Still waiting for signature upload');
                    }
                  } catch {
                    toast.error('Unable to refresh signature status');
                  }
                }}
                onCopyLink={async () => {
                  try {
                    const copied = await signatureQrFlow.copyLink();
                    if (copied) {
                      toast.success('Link clicked');
                    } else {
                      toast.error('Unable to copy link');
                    }
                  } catch {
                    toast.error('Unable to copy link');
                  }
                }}
                successTitle="Signature uploaded successfully."
                successDescription="Your signature has been saved and verified."
              />
            )}
          </div>

          {/* Step 2: Registration Number */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              {hasRegistration ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <h2 className="font-semibold text-sm">
                Step 2: Medical Registration Number
              </h2>
            </div>
            {hasRegistration ? (
              <p className="text-sm text-muted-foreground">
                Saved:{' '}
                <span className="font-medium text-foreground">
                  {profile?.registrationNumber}
                </span>
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="registration-number" className="text-xs text-muted-foreground">
                  Enter your medical council registration number
                </Label>
                <div className="flex gap-2">
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
                    aria-invalid={registrationError ? true : false}
                    className={`flex-1 ${registrationError ? 'border-destructive focus-visible:ring-destructive/40' : ''}`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!registrationNumber.trim() || isSavingReg}
                    onClick={handleSaveRegistration}
                  >
                    {isSavingReg ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
                {registrationError && (
                  <p className="text-xs text-destructive">{registrationError}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              className="w-full"
              disabled={!canContinue}
              onClick={handleContinue}
            >
              Continue to Dashboard
            </Button>
          </div>
          {!canContinue && (
            <p className="text-center text-xs text-muted-foreground">
              Complete all required steps to continue.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
