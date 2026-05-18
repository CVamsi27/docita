'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import { Card } from '@workspace/ui/components/indicators/card';
import { Button } from '@workspace/ui/components/form/button';
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/feedback/alert';
import { Badge } from '@workspace/ui/components/indicators/badge';
import { DATE_FORMATS, formatDate, formatDistanceToNow } from '@workspace/utils';
import { toast } from 'sonner';
import { typedApi } from '@/lib/api/api-client';
import { PageTransitionLoader } from '@/components/loaders/page-transition-loader';
import { useAuth } from '@/lib/auth/auth-context';
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { PreDashboardShell } from '@/features/auth/components/PreDashboardShell';
import { BackButton } from "@/components/navigation/back-button";

interface JoinRequest {
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

type TerminalState =
  | { kind: 'rejected'; clinicName: string; reason?: string }
  | { kind: 'withdrawn'; clinicName: string };

export default function JoinRequestStatusPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const [terminalState, setTerminalState] = useState<TerminalState | null>(
    null,
  );

  const { data: request, isLoading } = useQuery<JoinRequest | null>({
    queryKey: ['my-join-request'],
    queryFn: () => typedApi.joinRequests.getMine(),
    retry: false,
    refetchInterval: terminalState ? false : 10000,
  });

  const withdrawMutation = useMutation({
    mutationFn: (requestId: string) => typedApi.joinRequests.withdraw(requestId),
    onSuccess: () => {
      toast.success('Request withdrawn successfully');
      queryClient.invalidateQueries({ queryKey: ['my-join-request'] });
      if (request) {
        setTerminalState({
          kind: 'withdrawn',
          clinicName: request.clinic.name,
        });
      }
    },
    onError: () => {
      showUserFacingErrorToast(
        "We could not withdraw this request. Please try again.",
      );
    },
  });

  useEffect(() => {
    if (isLoading) return;
    if (terminalState) return;

    if (!user) {
      setRedirectMessage('Redirecting to login…');
      router.replace('/login?next=/join-request-status');
      return;
    }

    if (user.clinicId || user.onboardingStep === 'COMPLETED') {
      setRedirectMessage('Your request is complete. Taking you to your workspace…');
      router.replace('/today');
      return;
    }

    if (!request) {
      setRedirectMessage('No active request found. Returning to choose path…');
      router.replace('/choose-path');
    }
  }, [request, isLoading, router, user, terminalState]);

  useEffect(() => {
    if (!request || request.status === 'PENDING') return;
    if (terminalState) return;

    if (request.status === 'APPROVED') {
      void (async () => {
        await refreshUser();
        setRedirectMessage('Your request was approved. Taking you to your workspace…');
        router.replace('/today');
      })();
      return;
    }

    if (request.status === 'REJECTED') {
      setTerminalState({
        kind: 'rejected',
        clinicName: request.clinic.name,
        reason: request.rejectionReason,
      });
    }
  }, [request, refreshUser, router, terminalState]);

  if (terminalState) {
    return <JoinRequestTerminalState state={terminalState} />;
  }

  if (redirectMessage) {
    return (
      <PageTransitionLoader
        title="Redirecting…"
        description={redirectMessage}
      />
    );
  }

  if (isLoading) {
    return <PageTransitionLoader title="Loading request status…" />;
  }

  if (!request || request.status !== 'PENDING') {
    return (
      <PageTransitionLoader
        title="Updating status…"
        description="Checking the latest review decision…"
      />
    );
  }

  const getStatusIcon = () => {
    switch (request.status) {
      case 'PENDING':
        return <Clock className="h-6 w-6 text-warning" />;
      case 'APPROVED':
        return <CheckCircle2 className="h-6 w-6 text-success" />;
      case 'REJECTED':
        return <XCircle className="h-6 w-6 text-destructive" />;
      default:
        return <Clock className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (request.status) {
      case 'PENDING':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'APPROVED':
        return 'bg-success/10 text-success border-success/20';
      case 'REJECTED':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

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
        <Card className="ui-card-surface p-5 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4 mb-6">
            <div className={`p-3 rounded-full shrink-0 ${getStatusColor()} border`}>
              {getStatusIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="ui-section-title mb-1">
                Request Under Review
              </h2>
              <p className="ui-page-subtitle">
                You requested to join
                <span className="ml-1 font-semibold text-foreground">
                  {request.clinic.name}
                </span>
                <span className="ml-1">as a</span>
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

              {request.expiresAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Expires</p>
                  <p className="text-sm font-medium">
                    {formatDistanceToNow(request.expiresAt)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(request.expiresAt, DATE_FORMATS.DATETIME_MEDIUM)}
                  </p>
                </div>
              )}
            </div>

            {request.message && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Your Message</p>
                <Card className="p-3 bg-muted/50">
                  <p className="text-sm">{request.message}</p>
                </Card>
              </div>
            )}
          </div>

          <Alert className="mt-5">
            <Building2 className="h-4 w-4" />
            <AlertTitle>What happens next?</AlertTitle>
            <AlertDescription className="space-y-1.5 mt-1.5 text-sm">
              <p>The facility administrator will review your request and respond within 7 days</p>
              <p>You will receive notifications via WhatsApp and email when your request is reviewed</p>
            </AlertDescription>
          </Alert>

          <div className="flex justify-end mt-5">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => withdrawMutation.mutate(request.id)}
              disabled={withdrawMutation.isPending}
            >
              {withdrawMutation.isPending ? 'Withdrawing…' : 'Withdraw Request'}
            </Button>
          </div>
        </Card>
      </div>
    </PreDashboardShell>
  );
}

function JoinRequestTerminalState({ state }: { state: TerminalState }) {
  const isRejected = state.kind === 'rejected';
  const title = isRejected ? 'Join request not approved' : 'Join request withdrawn';
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
