'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle2, XCircle, Building2, ArrowLeft } from 'lucide-react';
import { Card } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert';
import { Badge } from '@workspace/ui/components/badge';
import { toast } from 'sonner';
import { typedApi } from '@/lib/api-client';
import { formatDistanceToNow, format } from 'date-fns';
import { ThemeToggle } from '@workspace/ui/components/theme-toggle';

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

  const { data: request, isLoading } = useQuery<JoinRequest | null>({
    queryKey: ['my-join-request'],
    queryFn: () => typedApi.joinRequests.getMine(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const withdrawMutation = useMutation({
    mutationFn: (requestId: string) => typedApi.joinRequests.withdraw(requestId),
    onSuccess: () => {
      toast.success('Request withdrawn successfully');
      queryClient.invalidateQueries({ queryKey: ['my-join-request'] });
      router.push('/choose-path');
    },
    onError: () => {
      toast.error('Failed to withdraw request');
    },
  });

  useEffect(() => {
    if (!isLoading && !request) {
      router.push('/choose-path');
    }
  }, [request, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!request || request.status !== 'PENDING') {
    return null;
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
    <div className="relative min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="container max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push('/choose-path')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Join Request Status</h1>
          <p className="text-muted-foreground">
            Your request is being reviewed by the clinic administrator
          </p>
        </div>

        <Card className="p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className={`p-3 rounded-full ${getStatusColor()} border`}>
              {getStatusIcon()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-2">
                Request Under Review
              </h2>
              <p className="text-muted-foreground">
                You requested to join{' '}
                <span className="font-semibold text-foreground">
                  {request.clinic.name}
                </span>{' '}
                as a <span className="font-semibold text-foreground">{request.requestedRole}</span>
              </p>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {request.status}
            </Badge>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="font-medium">
                  {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(request.requestedAt), 'PPpp')}
                </p>
              </div>

              {request.expiresAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Expires</p>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(request.expiresAt), { addSuffix: true })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(request.expiresAt), 'PPpp')}
                  </p>
                </div>
              )}
            </div>

            {request.message && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Your Message</p>
                <Card className="p-4 bg-muted/50">
                  <p className="text-sm">{request.message}</p>
                </Card>
              </div>
            )}
          </div>

          <Alert className="mt-6">
            <Building2 className="h-4 w-4" />
            <AlertTitle>What happens next?</AlertTitle>
            <AlertDescription className="space-y-2 mt-2">
              <p>
                The clinic administrator will review your request and respond within 7 days.
              </p>
              <p>
                You will receive notifications via WhatsApp and email when your request is reviewed.
              </p>
            </AlertDescription>
          </Alert>

          <div className="flex justify-end mt-6">
            <Button
              variant="destructive"
              onClick={() => withdrawMutation.mutate(request.id)}
              disabled={withdrawMutation.isPending}
            >
              {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw Request'}
            </Button>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact support at{' '}
            <a href="mailto:support@docita.work" className="text-primary hover:underline">
              support@docita.work
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
