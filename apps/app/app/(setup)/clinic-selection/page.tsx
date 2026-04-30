"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useAuth } from "@/lib/auth-context";
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";

export default function ClinicSelectionPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login?next=/clinic-selection");
      return;
    }

    if (user.emailVerified === false) {
      router.replace("/verify-email-sent");
      return;
    }

    if (user.clinicId) {
      router.replace("/dashboard");
      return;
    }

    if (user.onboardingStep === "JOINING_CLINIC") {
      router.replace("/join-request-status");
      return;
    }

    router.replace("/join-clinic");
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return (
      <PreDashboardShell currentStep="choose-path" showProgress={false}>
        <Card className="ui-card-surface w-full max-w-md">
          <CardHeader>
            <CardTitle className="ui-section-title">Preparing facility access</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center gap-2 py-8 ui-helper-text">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading facility workflow...
          </CardContent>
        </Card>
      </PreDashboardShell>
    );
  }

  return (
    <PageTransitionLoader
      title="Redirecting..."
      description="Taking you to the request-based facility join flow"
    />
  );
}
