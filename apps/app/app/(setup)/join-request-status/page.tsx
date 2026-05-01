'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import { Card } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert';
import { Badge } from '@workspace/ui/components/badge';
import { toast } from 'sonner';
import { typedApi } from '@/lib/api-client';
import { formatDistanceToNow, format } from 'date-fns';
import { PageTransitionLoader } from '@/components/common/loaders/page-transition-loader';
import { useAuth } from '@/lib/auth-context';
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { PreDashboardShell } from '@/features/auth/components/PreDashboardShell';
import { BackButton } from "@/components/common/navigation/back-button";

interface JoinRequest {
  id: string;
  status: string;
  requestedRole: string;
  message?: string;
  requestedAt: string;
  expiresAt?: string;
  clinic: {
    id: string;
    name: string;
  };
}

export default function JoinRequestStatusPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);

  const { data: request, isLoading } = useQuery<JoinRequest | null>({
    queryKey: ['my-join-request'],
    queryFn: () => typedApi.joinRequests.getMine(),
    retry: false,
    refetchInterval: 10000,
  });

  const withdrawMutation = useMutation({
    mutationFn: (requestId: string) => typedApi.joinRequests.withdraw(requestId),
    onSuccess: () => {
      toast.success('Request withdrawn successfully');
      queryClient.invalidateQueries({ queryKey: ['my-join-request'] });
      setRedirectMessage('Returning to choose path...');
      router.replace('/choose-path');
    },
    onError: () => {
      showUserFacingErrorToast(
        "We could not withdraw this request. Please try again.",
      );
    },
  });

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setRedirectMessage('Redirecting to login...');
      router.replace('/login?next=/join-request-status');
      return;
    }

    if (user.clinicId || user.onboardingStep === 'COMPLETED') {
      setRedirectMessage('Your request is complete. Taking you to the dashboard...');
      router.replace('/dashboard');
      return;
    }

    if (!request) {
      setRedirectMessage('No active request found. Returning to choose path...');
      router.replace('/choose-path');
    }
  }, [request, isLoading, router, user]);

  useEffect(() => {
    if (!request || request.status === 'PENDING') return;

    if (request.status === 'APPROVED') {
      void (async () => {
        await refreshUser();
        setRedirectMessage('Your request was approved. Taking you to the dashboard...');
        router.replace('/dashboard');
      })();
      return;
    }

    if (request.status === 'REJECTED') {
      setRedirectMessage('Your request was not approved. Returning to choose path...');
      router.replace('/choose-path');
    }
  }, [request, refreshUser, router]);

  if (redirectMessage) {
    return (
      <PageTransitionLoader
        title="Redirecting..."
        description={redirectMessage}
      />
    );
  }

  if (isLoading) {
    return <PageTransitionLoader title="Loading request status..." />;
  }

  if (!request || request.status !== 'PENDING') {
    return (
      <PageTransitionLoader
        title="Updating status..."
        description="Checking the latest review decision..."
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
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ui-copy-stack">
        <BackButton
          fallback="/choose-path"
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
        />
        <h1 className="ui-page-title">Join Request Status</h1>
        <p className="ui-page-subtitle">
          Your request is being reviewed by the facility administrator
        </p>
      </div>

      <div
        className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "100ms" }}
      >
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
                  {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(request.requestedAt), 'PPpp')}
                </p>
              </div>

              {request.expiresAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Expires</p>
                  <p className="text-sm font-medium">
                    {formatDistanceToNow(new Date(request.expiresAt), { addSuffix: true })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(request.expiresAt), 'PPpp')}
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
              {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw Request'}
            </Button>
          </div>
        </Card>
      </div>
    </PreDashboardShell>
  );
}
