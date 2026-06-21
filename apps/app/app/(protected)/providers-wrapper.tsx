"use client";

import { RealtimeProviders } from "@/components/layout/providers";
import { ClinicProvider } from "@/lib/contexts/clinic-context";
import { WorkspaceAppearanceController } from "@/components/layout/workspace-appearance-controller";
import { FeatureFlagsProvider } from "@/hooks/use-feature-flag";
import { DoctorVerificationGuard } from "@/components/guards/doctor-verification-guard";
import { SubscriptionGuard } from "@/components/guards/subscription-guard";
import { PageAccessGuard } from "@/components/guards/page-access-guard";
import { AskAiProvider } from "@/components/ask-ai/ask-ai-context";
import { GuidedTourProvider } from "@/features/guided-tour";

export function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProviders>
      <ClinicProvider>
        <WorkspaceAppearanceController />
        <FeatureFlagsProvider>
          <DoctorVerificationGuard>
            <SubscriptionGuard>
              <PageAccessGuard>
                <AskAiProvider>
                  <GuidedTourProvider>{children}</GuidedTourProvider>
                </AskAiProvider>
              </PageAccessGuard>
            </SubscriptionGuard>
          </DoctorVerificationGuard>
        </FeatureFlagsProvider>
      </ClinicProvider>
    </RealtimeProviders>
  );
}
