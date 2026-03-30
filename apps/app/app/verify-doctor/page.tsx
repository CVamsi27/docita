'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useAPIQuery, useAPIMutation } from '@/lib/api-core';
import { SignatureUploadQR } from '@/features/settings/components/signature-upload-qr';
import type { User } from '@workspace/types';
import { ThemeToggle } from '@workspace/ui/components/theme-toggle';
import { DocitaLogo } from '@workspace/ui/components/docita-logo';

export default function VerifyDoctorPage() {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [isSavingReg, setIsSavingReg] = useState(false);
  const isDoctor = user?.role === 'DOCTOR' || user?.role === 'ADMIN_DOCTOR';

  const { data: doctorProfile, isLoading: profileLoading, refetch } = useAPIQuery<User>(
    ['doctor-profile', user?.id ?? ''],
    `/doctors/${user?.id}`,
    { enabled: !!user?.id && isDoctor },
  );

  const updateDoctor = useAPIMutation<User, { registrationNumber: string }>(
    `/doctors/${user?.id}`,
    'PUT',
    { invalidateKeys: [['doctor-profile', user?.id ?? '']] },
  );

  const profile = doctorProfile ?? user;
  const hasSignature = !!profile?.signatureUrl;
  const hasRegistration = !!profile?.registrationNumber;
  const canContinue = hasSignature && hasRegistration;

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login?next=/verify-doctor');
      return;
    }

    if (!isDoctor) {
      router.replace('/dashboard');
      return;
    }

    if (canContinue) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, isDoctor, canContinue, router]);

  useEffect(() => {
    if (!user?.id || !isDoctor || hasSignature) return;
    const intervalId = window.setInterval(() => {
      void refetch();
    }, 8000);
    return () => window.clearInterval(intervalId);
  }, [user?.id, isDoctor, hasSignature, refetch]);

  const handleSaveRegistration = async () => {
    if (!registrationNumber.trim()) return;
    setIsSavingReg(true);
    try {
      await updateDoctor.mutateAsync({ registrationNumber: registrationNumber.trim() });
      await refetch();
      toast.success('Registration number saved.');
    } catch {
      toast.error('Failed to save registration number.');
    } finally {
      setIsSavingReg(false);
    }
  };

  const handleContinue = async () => {
    await refreshUser();
    router.replace('/dashboard');
  };

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
        <DocitaLogo />
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
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Signature uploaded successfully.
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Generate a QR code and upload your signature from your mobile device.
              </p>
            )}
            {!hasSignature && (
              <div className="pt-2 space-y-2">
                <SignatureUploadQR />
                <div className="flex items-center justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void refetch()}
                    disabled={profileLoading}
                  >
                    Refresh upload status
                  </Button>
                </div>
              </div>
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
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="flex-1"
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
