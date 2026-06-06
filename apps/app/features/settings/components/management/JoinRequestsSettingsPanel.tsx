"use client";

import { UserPlus } from "lucide-react";
import { Card } from "@workspace/ui/components/indicators/card";
import { LoadingState } from "@workspace/ui/components/feedback/empty-state";
import { JoinRequestCard } from "./join-request-card";
import { JoinRequestReviewDialogs } from "./join-request-review-dialogs";
import { useJoinRequestsSettings } from "./use-join-requests-settings";

export function JoinRequestsSettingsPanel() {
  const panel = useJoinRequestsSettings();
  const isMutating =
    panel.approveMutation.isPending || panel.rejectMutation.isPending;

  if (panel.isLoading) return (
      <div className="min-h-[30vh]">
        <LoadingState message="Loading join requests…" className="py-16" />
      </div>
    );

  return (
    <div className="space-y-6">
      {panel.requests.length === 0 ? (
        <Card className="ui-card-surface p-12 text-center">
          <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="ui-section-title mb-2">No Pending Requests</h3>
          <p className="ui-page-subtitle">
            There are no join requests waiting for your review at this time
          </p>
        </Card>
      ) : null}

      <div className="space-y-4">
        {panel.requests.map((request) => (
          <JoinRequestCard
            key={request.id}
            request={request}
            isMutating={isMutating}
            onApprove={() => panel.openApproveDialog(request)}
            onReject={() => panel.openRejectDialog(request)}
          />
        ))}
      </div>

      <JoinRequestReviewDialogs
        selectedRequest={panel.selectedRequest}
        actionType={panel.actionType}
        assignedRole={panel.assignedRole}
        setAssignedRole={panel.setAssignedRole}
        welcomeMessage={panel.welcomeMessage}
        setWelcomeMessage={panel.setWelcomeMessage}
        rejectionReason={panel.rejectionReason}
        setRejectionReason={panel.setRejectionReason}
        isApproving={panel.approveMutation.isPending}
        isRejecting={panel.rejectMutation.isPending}
        onClose={panel.closeDialog}
        onApprove={panel.handleApprove}
        onReject={panel.handleReject}
      />
    </div>
  );
}
