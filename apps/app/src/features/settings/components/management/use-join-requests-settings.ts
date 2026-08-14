import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@workspace/data-access";
import { typedApi } from "@/lib/api/typed-api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  fetchPendingJoinRequests,
  type JoinRequest,
} from "./join-requests-list.boundary";

export function useJoinRequestsSettings() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(
    null,
  );
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [assignedRole, setAssignedRole] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests = [], isLoading } = useQuery<JoinRequest[]>({
    queryKey: queryKeys.clinicJoinRequests.all(),
    queryFn: () =>
      fetchPendingJoinRequests(() => typedApi.joinRequests.list("PENDING")),
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { assignedRole?: string; welcomeMessage?: string };
    }) => typedApi.joinRequests.approve(id, data),
    onSuccess: () => {
      toast.success("Join request approved! User can now access the dashboard");
      queryClient.invalidateQueries({
        queryKey: queryKeys.clinicJoinRequests.all(),
      });
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
      toast.success("Join request rejected");
      queryClient.invalidateQueries({
        queryKey: queryKeys.clinicJoinRequests.all(),
      });
      closeDialog();
    },
    onError: () => {
      showUserFacingErrorToast(
        "We could not reject this join request. Please try again.",
      );
    },
  });

  const closeDialog = () => {
    setSelectedRequest(null);
    setActionType(null);
    setAssignedRole("");
    setWelcomeMessage("");
    setRejectionReason("");
  };

  const openApproveDialog = (request: JoinRequest) => {
    setSelectedRequest(request);
    setActionType("approve");
    setAssignedRole(request.requestedRole);
    setWelcomeMessage("");
  };

  const openRejectDialog = (request: JoinRequest) => {
    setSelectedRequest(request);
    setActionType("reject");
    setRejectionReason("");
  };

  const handleApprove = () => {
    if (!selectedRequest) return;

    approveMutation.mutate({
      id: selectedRequest.id,
      data: {
        assignedRole:
          assignedRole !== selectedRequest.requestedRole
            ? assignedRole
            : undefined,
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

  return {
    requests,
    isLoading,
    selectedRequest,
    actionType,
    assignedRole,
    setAssignedRole,
    welcomeMessage,
    setWelcomeMessage,
    rejectionReason,
    setRejectionReason,
    approveMutation,
    rejectMutation,
    closeDialog,
    openApproveDialog,
    openRejectDialog,
    handleApprove,
    handleReject,
  };
}
