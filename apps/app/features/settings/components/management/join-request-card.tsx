"use client";

import {
  UserPlus,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card } from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { formatDistanceToNow } from "@workspace/utils";
import type { JoinRequest } from "@/features/settings/components/management/join-requests-list.boundary";

export function JoinRequestCard({
  request,
  isMutating,
  onApprove,
  onReject,
}: {
  request: JoinRequest;
  isMutating: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card className="ui-card-surface p-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-4">
            <div className="rounded-full border border-border/70 bg-background/70 p-2">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="ui-section-title text-[var(--fs-lg)]">
                {request.user.name}
              </h3>
              <Badge variant="secondary" className="mt-1">
                Requested: {request.requestedRole}
              </Badge>
            </div>
          </div>

          <div className="ml-11 space-y-2 ui-helper-text">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{request.user.email}</span>
            </div>
            {request.user.phoneNumber ? (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{request.user.phoneNumber}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                Submitted
                <span className="ml-1">
                  {formatDistanceToNow(request.requestedAt)}
                </span>
              </span>
            </div>
          </div>

          {request.message ? (
            <Card className="ui-card-surface mt-4 ml-11 p-4 bg-muted/25">
              <p className="text-sm font-medium mb-1">Message from applicant:</p>
              <p className="ui-helper-text">{request.message}</p>
            </Card>
          ) : null}
        </div>

        <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
          <Button
            onClick={onApprove}
            className="flex-1 lg:w-full"
            disabled={isMutating}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            className="flex-1 lg:w-full"
            disabled={isMutating}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
      </div>
    </Card>
  );
}
