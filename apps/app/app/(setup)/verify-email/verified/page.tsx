"use client";

import { CheckCircle2 } from "lucide-react";

export default function VerifyEmailVerifiedPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
        </div>
        <p className="text-base font-semibold text-foreground" role="status" aria-live="polite">
          Verified
        </p>
      </div>
    </main>
  );
}

