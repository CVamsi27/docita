"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useAuth, type User } from "@/lib/auth-context";

function getNextPathForVerifiedUser(user: User | null): string {
  if (!user) {
    return "/login?next=/verify-email/verified";
  }

  if (user.clinicId || user.onboardingStep === "COMPLETED") {
    return "/today";
  }

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
  const router = useRouter();
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
        </div>
        <p
          className="text-base font-semibold text-foreground"
          role="status"
          aria-live="polite"
        >
          Verified
        </p>
        <Button
          className="w-full"
          onClick={() => router.push(getNextPathForVerifiedUser(user))}
        >
          Continue
        </Button>
      </div>
    </main>
  );
}
