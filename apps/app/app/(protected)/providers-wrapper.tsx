"use client";

import { RealtimeProviders } from "@/components/layout/providers";
import { ClinicProvider } from "@/lib/contexts/clinic-context";
import { WorkspaceAppearanceController } from "@/components/layout/workspace-appearance-controller";
import { FeatureFlagsProvider } from "@/hooks/use-feature-flag";
import { DoctorVerificationGuard } from "@/components/guards/doctor-verification-guard";
import { SubscriptionGuard } from "@/components/guards/subscription-guard";
import { PageAccessGuard } from "@/components/guards/page-access-guard";
import { AskAiProvider } from "@/components/ask-ai/ask-ai-context";

export function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProviders>
      <ClinicProvider>
        <WorkspaceAppearanceController />
        <FeatureFlagsProvider>
          <DoctorVerificationGuard>
            <SubscriptionGuard>
              <PageAccessGuard>
                <AskAiProvider>{children}</AskAiProvider>
              </PageAccessGuard>
            </SubscriptionGuard>
          </DoctorVerificationGuard>
        </FeatureFlagsProvider>
      </ClinicProvider>
    </RealtimeProviders>
  );
}
