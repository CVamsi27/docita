"use client";

import { Clock, Building2 } from "lucide-react";
import { Card } from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  DATE_FORMATS,
  formatDate,
  formatDistanceToNow,
} from "@workspace/utils";

export interface JoinRequestStatusItem {
  id: string;
  status: string;
  requestedRole: string;
  message?: string;
  rejectionReason?: string;
  requestedAt: string;
  expiresAt?: string;
  clinic: {
    id: string;
    name: string;
  };
}

export function JoinRequestStatusPendingCard({
  request,
  onWithdraw,
  isWithdrawing,
}: {
  request: JoinRequestStatusItem;
  onWithdraw: () => void;
  isWithdrawing: boolean;
}) {
  return (
    <Card className="ui-card-surface p-5 sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4 mb-6">
        <div className="p-3 rounded-full shrink-0 bg-warning/10 text-warning border border-warning/20">
          <Clock className="h-6 w-6 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="ui-section-title mb-1">Request Under Review</h2>
          <p className="ui-page-subtitle">
            You requested to join
            <span className="ml-1 font-semibold text-foreground">
              {request.clinic.name}
            </span>
            <span className="ml-1">with role</span>
            <span className="ml-1 font-semibold text-foreground">
              {request.requestedRole}
            </span>
          </p>
        </div>
        <Badge variant="secondary" className="text-xs px-2.5 py-1 shrink-0">
          {request.status}
        </Badge>
      </div>

      <div className="border-t pt-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Submitted</p>
            <p className="text-sm font-medium">
              {formatDistanceToNow(request.requestedAt)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(request.requestedAt, DATE_FORMATS.DATETIME_MEDIUM)}
            </p>
          </div>

          {request.expiresAt ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Expires</p>
              <p className="text-sm font-medium">
                {formatDistanceToNow(request.expiresAt)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(request.expiresAt, DATE_FORMATS.DATETIME_MEDIUM)}
              </p>
            </div>
          ) : null}
        </div>

        {request.message ? (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Your Message</p>
            <Card className="p-3 bg-muted/50">
              <p className="text-sm">{request.message}</p>
            </Card>
          </div>
        ) : null}
      </div>

      <Alert className="mt-5">
        <Building2 className="h-4 w-4" />
        <AlertTitle>What happens next?</AlertTitle>
        <AlertDescription className="space-y-1.5 mt-1.5 text-sm">
          <p>
            The facility administrator will review your request and respond
            within 7 days
          </p>
          <p>
            You will receive notifications via WhatsApp and email when your
            request is reviewed
          </p>
        </AlertDescription>
      </Alert>

      <div className="flex justify-end mt-5">
        <Button
          variant="destructive"
          size="sm"
          onClick={onWithdraw}
          disabled={isWithdrawing}
        >
          {isWithdrawing ? "Withdrawing…" : "Withdraw Request"}
        </Button>
      </div>
    </Card>
  );
}
