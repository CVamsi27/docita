"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useAuth } from "@/lib/auth-context";
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";

export default function ClinicSelectionPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login?next=/clinic-selection");
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
      <main className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Preparing your clinic access</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading clinic workflow...
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <PageTransitionLoader
      title="Redirecting..."
      description="Taking you to the request-based clinic join flow."
    />
  );
}
