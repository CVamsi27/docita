'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { DocitaLogo } from '@workspace/ui/components/docita-logo';
import { ThemeToggle } from '@workspace/ui/components/theme-toggle';
import { AuthBrandingPanel } from '@/features/auth/components/AuthBrandingPanel';
import { useAuth } from '@/lib/auth-context';
import { logger } from '@/lib/logger';
import { API_URL } from '@/lib/api-config';

type VerifyState = 'loading' | 'success' | 'error' | 'missing';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [state, setState] = useState<VerifyState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('missing');
      return;
    }

    const base = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;

    fetch(`${base}auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setState('success');
        } else {
          const data = await res.json().catch(() => ({}));
          const msg =
            (data as { message?: string }).message ||
            'The verification link is invalid or has expired.';
          setErrorMessage(msg);
          setState('error');
        }
      })
      .catch((err) => {
        logger.error('Email verification request failed', { err });
        setErrorMessage('Something went wrong. Please try again.');
        setState('error');
      });
  }, [searchParams]);

  const handleContinue = () => {
    if (user?.clinicId) {
      router.push('/dashboard');
      return;
    }
    switch (user?.onboardingStep) {
      case 'JOINING_CLINIC':
        router.push('/join-request-status');
        break;
      case 'CREATING_CLINIC':
        router.push('/onboarding');
        break;
      default:
        router.push('/choose-path');
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AuthBrandingPanel />

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-10 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 60% 40%, oklch(var(--primary) / 0.04) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="lg:hidden flex justify-center">
            <DocitaLogo />
          </div>

          <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-8 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {state === 'loading' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Verifying your email...</p>
              </div>
            )}

            {state === 'success' && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight">Email verified</h1>
                  <p className="text-muted-foreground text-sm">
                    Your email has been verified. You can now continue setting up your account.
                  </p>
                </div>
                <Button className="w-full h-11" onClick={handleContinue}>
                  Continue
                </Button>
              </div>
            )}

            {(state === 'error' || state === 'missing') && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
                    <XCircle className="h-8 w-8 text-destructive" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight">Verification failed</h1>
                  <p className="text-muted-foreground text-sm">
                    {state === 'missing'
                      ? 'No verification link was found. Please use the link from your email.'
                      : errorMessage}
                  </p>
                </div>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => router.push('/verify-email-sent')}
                  >
                    Request a new link
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full h-11"
                    onClick={() => router.push('/login')}
                  >
                    Back to login
                  </Button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Need help?{' '}
            <a
              href="mailto:support@docita.work"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
