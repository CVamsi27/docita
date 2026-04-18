'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Mail, Phone, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Textarea } from '@workspace/ui/components/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@workspace/ui/components/dialog';
import { toast } from 'sonner';
import { typedApi } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

interface JoinRequest {
  id: string;
  status: string;
  requestedRole: string;
  message?: string;
  requestedAt: string;
  expiresAt?: string;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
  };
}

export default function JoinRequestsPage() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [assignedRole, setAssignedRole] = useState<string>('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: requests = [], isLoading } = useQuery<JoinRequest[]>({
    queryKey: ['clinic-join-requests'],
    queryFn: () => typedApi.joinRequests.list('PENDING') as Promise<JoinRequest[]>,
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { assignedRole?: string; welcomeMessage?: string } }) =>
      typedApi.joinRequests.approve(id, data),
    onSuccess: () => {
      toast.success('Join request approved! User can now access the dashboard');
      queryClient.invalidateQueries({ queryKey: ['clinic-join-requests'] });
      closeDialog();
    },
    onError: () => {
      showUserFacingErrorToast(
        "We could not approve this join request. Please try again.",
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason: string } }) =>
      typedApi.joinRequests.reject(id, data),
    onSuccess: () => {
      toast.success('Join request rejected');
      queryClient.invalidateQueries({ queryKey: ['clinic-join-requests'] });
      closeDialog();
    },
    onError: () => {
      showUserFacingErrorToast(
        "We could not reject this join request. Please try again.",
      );
    },
  });

  const openApproveDialog = (request: JoinRequest) => {
    setSelectedRequest(request);
    setActionType('approve');
    setAssignedRole(request.requestedRole);
    setWelcomeMessage('');
  };

  const openRejectDialog = (request: JoinRequest) => {
    setSelectedRequest(request);
    setActionType('reject');
    setRejectionReason('');
  };

  const closeDialog = () => {
    setSelectedRequest(null);
    setActionType(null);
    setAssignedRole('');
    setWelcomeMessage('');
    setRejectionReason('');
  };

  const handleApprove = () => {
    if (!selectedRequest) return;

    approveMutation.mutate({
      id: selectedRequest.id,
      data: {
        assignedRole: assignedRole !== selectedRequest.requestedRole ? assignedRole : undefined,
        welcomeMessage: welcomeMessage.trim() || undefined,
      },
    });
  };

  const handleReject = () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      showUserFacingErrorToast(
        "Add a reason so the team member knows why this request was declined",
      );
      return;
    }

    rejectMutation.mutate({
      id: selectedRequest.id,
      data: { reason: rejectionReason.trim() },
    });
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading join requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">Team Join Requests</h1>
        <p className="text-muted-foreground">
          Review and approve requests from users who want to join your facility
        </p>
      </div>

      {requests.length === 0 && (
        <Card className="p-12 text-center">
          <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
          <p className="text-muted-foreground">
            There are no join requests waiting for your review at this time
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id} className="p-6">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{request.user.name}</h3>
                    <Badge variant="secondary" className="mt-1">
                      Requested: {request.requestedRole}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 text-sm ml-11">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{request.user.email}</span>
                  </div>
                  {request.user.phoneNumber && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{request.user.phoneNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Submitted {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {request.message && (
                  <Card className="p-4 bg-muted/50 mt-4 ml-11">
                    <p className="text-sm font-medium mb-1">Message from applicant:</p>
                    <p className="text-sm text-muted-foreground">{request.message}</p>
                  </Card>
                )}
              </div>

              <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                <Button
                  onClick={() => openApproveDialog(request)}
                  className="flex-1 lg:w-full"
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openRejectDialog(request)}
                  className="flex-1 lg:w-full"
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Approve Dialog */}
      <Dialog open={actionType === 'approve'} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Approve Join Request</DialogTitle>
            <DialogDescription>
              Approve {selectedRequest?.user.name} to join your facility
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned Role</label>
              <Select value={assignedRole} onValueChange={setAssignedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCTOR">Doctor</SelectItem>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                  <SelectItem value="ADMIN_DOCTOR">Admin Doctor</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {assignedRole !== selectedRequest?.requestedRole &&
                  `This differs from the requested role (${selectedRequest?.requestedRole})`}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Welcome Message <span className="text-muted-foreground">(Optional)</span>
              </label>
              <Textarea
                placeholder="Welcome to the team! Feel free to reach out if you have any questions..."
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">
                {welcomeMessage.length}/500
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={approveMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? 'Approving...' : 'Approve Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionType === 'reject'} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reject Join Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedRequest?.user.name}&apos;s request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <label className="text-sm font-medium">Reason for Rejection</label>
            <Textarea
              placeholder="Please explain why this request cannot be approved at this time..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              maxLength={500}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {rejectionReason.length}/500
            </p>
            <p className="text-xs text-muted-foreground">
              This reason will be sent to the applicant
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={rejectMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
