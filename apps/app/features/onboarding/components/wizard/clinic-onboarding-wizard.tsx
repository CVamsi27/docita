"use client";

import { useEffect } from "react";
import { ClinicRegistrationForm } from "@/features/onboarding/components/forms/clinic-registration-form";
import { useRouter } from "next/navigation";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Loader2 } from "lucide-react";

export function ClinicOnboardingWizard() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login?next=/onboarding");
      return;
    }

    if (user.clinicId) {
      router.replace("/dashboard");
    }
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-2xl items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing onboarding...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8 space-y-8">
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <DocitaLogo />
        </div>
        <h1 className="text-3xl font-bold">Welcome to Docita</h1>
        <p className="text-muted-foreground">
          Complete your clinic registration to get started.
        </p>
      </div>

      <ClinicRegistrationForm
        onSuccess={() =>
          user?.role === "ADMIN_DOCTOR"
            ? router.push("/verify-doctor")
            : router.push("/dashboard")
        }
      />
    </div>
  );
}
