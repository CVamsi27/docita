"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { appQueryKeys } from "@workspace/data-access";
import { typedApi } from "@/lib/api/api-client";
import { useAuth } from "@/lib/auth/auth-context";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { JoinRequestStatusItem } from "@/features/onboarding/components/join-request-status-pending-card";
import type { JoinRequestTerminalState } from "@/features/onboarding/components/join-request-status-terminal";

export function useJoinRequestStatusPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const [terminalState, setTerminalState] =
    useState<JoinRequestTerminalState | null>(null);

  const { data: request, isLoading } = useQuery<JoinRequestStatusItem | null>({
    queryKey: appQueryKeys.onboarding.myJoinRequest(),
    queryFn: () => typedApi.joinRequests.getMine(),
    retry: false,
    refetchInterval: terminalState ? false : 10000,
  });

  const withdrawMutation = useMutation({
    mutationFn: (requestId: string) =>
      typedApi.joinRequests.withdraw(requestId),
    onSuccess: () => {
      toast.success("Request withdrawn successfully");
      queryClient.invalidateQueries({
        queryKey: appQueryKeys.onboarding.myJoinRequest(),
      });
      if (request) {
        setTerminalState({
          kind: "withdrawn",
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
      setRedirectMessage("Redirecting to login…");
      router.replace("/login?next=/join-request-status");
      return;
    }

    if (user.clinicId || user.onboardingStep === "COMPLETED") {
      setRedirectMessage(
        "Your request is complete. Taking you to your workspace…",
      );
      router.replace("/today");
      return;
    }

    if (!request) {
      setRedirectMessage("No active request found. Returning to choose path…");
      router.replace("/choose-path");
    }
  }, [request, isLoading, router, user, terminalState]);

  useEffect(() => {
    if (!request || request.status === "PENDING") return;
    if (terminalState) return;

    if (request.status === "APPROVED") {
      void (async () => {
        await refreshUser();
        setRedirectMessage(
          "Your request was approved. Taking you to your workspace…",
        );
        router.replace("/today");
      })();
      return;
    }

    if (request.status === "REJECTED") {
      setTerminalState({
        kind: "rejected",
        clinicName: request.clinic.name,
        reason: request.rejectionReason,
      });
    }
  }, [request, refreshUser, router, terminalState]);

  const viewState = (() => {
    if (terminalState) return "terminal" as const;
    if (redirectMessage) return "redirect" as const;
    if (isLoading) return "loading" as const;
    if (!request || request.status !== "PENDING") return "updating" as const;
    return "pending" as const;
  })();

  return {
    request,
    terminalState,
    redirectMessage,
    viewState,
    withdrawMutation,
  };
}
