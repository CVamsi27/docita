"use client";

import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";
import { BackButton } from "@/components/navigation/back-button";
import { JoinRequestStatusPendingCard } from "@/features/onboarding/components/join-request-status-pending-card";
import { JoinRequestStatusTerminal } from "@/features/onboarding/components/join-request-status-terminal";
import { useJoinRequestStatusPage } from "@/features/onboarding/hooks/use-join-request-status-page";

export default function JoinRequestStatusPage() {
  const {
    request,
    terminalState,
    redirectMessage,
    viewState,
    withdrawMutation,
  } = useJoinRequestStatusPage();

  if (viewState === "terminal" && terminalState) {
    return <JoinRequestStatusTerminal state={terminalState} />;
  }

  if (viewState === "redirect" && redirectMessage) {
    return (
      <PageTransitionLoader
        title="Redirecting…"
        description={redirectMessage}
      />
    );
  }

  if (viewState === "loading") {
    return <PageTransitionLoader title="Loading request status…" />;
  }

  if (viewState === "updating") {
    return (
      <PageTransitionLoader
        title="Updating status…"
        description="Checking the latest review decision…"
      />
    );
  }

  if (!request) {
    return null;
  }

  return (
    <PreDashboardShell
      currentStep="join-request-status"
      contentMaxWidth="max-w-2xl"
    >
      <div className="ui-copy-stack">
        <BackButton
          fallback="/choose-path"
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
        />
        <h1 className="ui-page-title">Join Request Status</h1>
        <p className="ui-page-subtitle">
          Your request is being reviewed by the facility administrator
        </p>
      </div>

      <div className="space-y-4">
        <JoinRequestStatusPendingCard
          request={request}
          onWithdraw={() => withdrawMutation.mutate(request.id)}
          isWithdrawing={withdrawMutation.isPending}
        />
      </div>
    </PreDashboardShell>
  );
}
