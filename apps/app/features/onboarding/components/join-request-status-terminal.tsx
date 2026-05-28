"use client";

import Link from "next/link";
import { Building2, XCircle } from "lucide-react";
import { Card } from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { PreDashboardShell } from "@/features/auth";

export type JoinRequestTerminalState =
  | { kind: "rejected"; clinicName: string; reason?: string }
  | { kind: "withdrawn"; clinicName: string };

export function JoinRequestStatusTerminal({
  state,
}: {
  state: JoinRequestTerminalState;
}) {
  const isRejected = state.kind === "rejected";
  const title = isRejected ? "Join request not approved" : "Join request withdrawn";
  const description = isRejected
    ? `${state.clinicName} did not approve your request to join.`
    : `You withdrew your request to join ${state.clinicName}.`;

  return (
    <PreDashboardShell
      currentStep="join-request-status"
      contentMaxWidth="max-w-2xl"
    >
      <div
        className="ui-copy-stack"
        data-testid={`join-request-terminal-${state.kind}`}
      >
        <h1 className="ui-page-title">{title}</h1>
        <p className="ui-page-subtitle">{description}</p>
      </div>

      <Card className="ui-card-surface p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-destructive/20 bg-destructive/10 p-3 text-destructive">
            <XCircle className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="ui-section-title">{title}</h2>
            <p className="ui-page-subtitle">{description}</p>
            {isRejected && state.reason ? (
              <p className="mt-3 text-sm text-foreground">
                <span className="font-medium">Reason: </span>
                {state.reason}
              </p>
            ) : null}
          </div>
        </div>

        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertTitle>Pick your next step</AlertTitle>
          <AlertDescription className="mt-1.5 text-sm">
            You can request to join a different clinic or set up a new clinic
            of your own. Your account stays intact either way.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" className="sm:order-1">
            <Link
              href="/choose-path"
              data-testid="join-request-create-clinic"
            >
              Create a new clinic
            </Link>
          </Button>
          <Button asChild className="sm:order-2">
            <Link
              href="/join-clinic"
              data-testid="join-request-try-different-clinic"
            >
              Try a different clinic
            </Link>
          </Button>
        </div>
      </Card>
    </PreDashboardShell>
  );
}
