"use client";

// jscpd:ignore-start
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { useAuth, type User } from "@/lib/auth/auth-context";

function getNextPathForVerifiedUser(user: User | null): string {
  if (!user) return "/login?next=/verify-email/verified";

  if (user.clinicId || user.onboardingStep === "COMPLETED") return "/today";

  switch (user.onboardingStep) {
    case "JOINING_CLINIC":
      return "/join-request-status";
    case "CREATING_CLINIC":
      return "/onboarding";
    default:
      return "/choose-path";
  }
}

export default function VerifyEmailVerifiedPage() {
// jscpd:ignore-end
  const router = useRouter();
  const { user } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="ui-card-surface flex w-full max-w-sm flex-col items-center gap-5 rounded-[var(--radius-xl)] p-8 text-center">
        <div className="relative mx-auto w-fit">
          <div
            aria-hidden
            className="absolute inset-0 scale-110 rounded-full bg-success/20 blur-md"
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-success/25 bg-success/[0.1] text-success shadow-sm">
            <CheckCircle2
              className="h-8 w-8"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <h1 className="ui-section-title" role="status" aria-live="polite">
            Email verified
          </h1>
          <p className="ui-page-subtitle">
            Your account is confirmed. Let’s finish setting things up.
          </p>
        </div>
        <Button
          className="h-11 w-full font-semibold"
          onClick={() => router.push(getNextPathForVerifiedUser(user))}
        >
          Continue
        </Button>
      </div>
    </main>
  );
}
