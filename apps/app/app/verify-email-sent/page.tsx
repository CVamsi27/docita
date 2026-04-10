'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { ThemeToggle } from '@workspace/ui/components/theme-toggle';
import { DocitaLogo } from '@workspace/ui/components/docita-logo';
import { toast } from 'sonner';
import { AuthBrandingPanel } from '@/features/auth/components/AuthBrandingPanel';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

export default function VerifyEmailSentPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await apiFetch('/auth/resend-verification', { method: 'POST' });
      setResent(true);
      toast.success('Verification email resent. Check your inbox.');
    } catch (error) {
      logger.error('Failed to resend verification email', { error });
      showUserFacingErrorToast('We could not resend email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const email = user?.email ?? 'your email';

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

        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Sign out
          </Button>
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="lg:hidden flex justify-center">
            <DocitaLogo />
          </div>

          <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-8 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
              <p className="text-muted-foreground text-sm">
                We sent a verification link to
              </p>
              <p className="font-medium text-sm">{email}</p>
              <p className="text-muted-foreground text-sm pt-1">
                Click the link in the email to verify your account and continue setting up your clinic.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={handleResend}
                disabled={resending || resent}
              >
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : resent ? (
                  'Email sent'
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend verification email
                  </>
                )}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Wrong email?{' '}
              <button
                type="button"
                onClick={logout}
                className="underline underline-offset-4 hover:text-foreground transition-colors"
              >
                Sign out and try again
              </button>
            </p>
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
