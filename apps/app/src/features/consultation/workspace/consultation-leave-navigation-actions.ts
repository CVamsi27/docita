import { useCallback, useState, type RefObject } from "react";
import { useNavigate } from "react-router";
import { readInAppNavCount } from "@/hooks/use-can-go-back";
import { consultationDraftNeedsLeaveGuard, useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import {
  parseSameOriginAppNavigationUrl,
  resolveConsultationHrefNavigation,
} from "@/features/consultation/workspace/consultation-leave-navigation-helpers";
import type { NavigateAwayKind } from "@/features/consultation/workspace/consultation-leave-helpers";
import type {
  ConsultationSaveHandles,
  PendingHrefRef,
  SetLeaveDialogOpen,
} from "./consultation-leave-navigation-types";

export function useLeaveDialogState(pendingLinkNavigationHrefRef: PendingHrefRef) {
  const [leaveDialogOpen, setLeaveDialogOpenInternal] = useState(false);
  const onLeaveDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        pendingLinkNavigationHrefRef.current = null;
      }
      setLeaveDialogOpenInternal(open);
    },
    [pendingLinkNavigationHrefRef],
  );
  return {
    leaveDialogOpen,
    setLeaveDialogOpenInternal,
    onLeaveDialogOpenChange,
  };
}

export function useNavigateAway(params: {
  navigate: ReturnType<typeof useNavigate>;
  fallbackRoute: string;
  pendingLinkNavigationHrefRef: PendingHrefRef;
}) {
  const { navigate, fallbackRoute, pendingLinkNavigationHrefRef } = params;
  return useCallback(
    (kind: NavigateAwayKind = "default") => {
      const pendingHref = pendingLinkNavigationHrefRef.current;
      pendingLinkNavigationHrefRef.current = null;
      if (pendingHref) {
        navigate(pendingHref);
        return;
      }
      if (kind === "leaveDialogCompleted") {
        navigate(fallbackRoute);
        return;
      }
      if (readInAppNavCount() > 1) {
        navigate(-1);
        return;
      }
      navigate(fallbackRoute);
    },
    [fallbackRoute, pendingLinkNavigationHrefRef, navigate],
  );
}

export function useTryNavigateAway(params: {
  readOnly: boolean;
  navigateAway: (kind?: NavigateAwayKind) => void;
  pendingLinkNavigationHrefRef: PendingHrefRef;
  setLeaveDialogOpenInternal: SetLeaveDialogOpen;
}) {
  const {
    readOnly,
    navigateAway,
    pendingLinkNavigationHrefRef,
    setLeaveDialogOpenInternal,
  } = params;
  return useCallback(() => {
    if (readOnly) {
      navigateAway();
      return;
    }
    if (!consultationDraftNeedsLeaveGuard(useConsultationDraft.getState())) {
      navigateAway();
      return;
    }
    pendingLinkNavigationHrefRef.current = null;
    setLeaveDialogOpenInternal(true);
  }, [
    readOnly,
    navigateAway,
    pendingLinkNavigationHrefRef,
    setLeaveDialogOpenInternal,
  ]);
}

export function useAttemptNavigateToHref(params: {
  readOnly: boolean;
  navigate: ReturnType<typeof useNavigate>;
  activeAppointmentId: string;
  pendingLinkNavigationHrefRef: PendingHrefRef;
  setLeaveDialogOpenInternal: SetLeaveDialogOpen;
}) {
  const {
    readOnly,
    navigate,
    activeAppointmentId,
    pendingLinkNavigationHrefRef,
    setLeaveDialogOpenInternal,
  } = params;
  return useCallback(
    (rawHref: string) => {
      if (typeof window === "undefined") return;
      const trimmed = rawHref.trim();
      if (!trimmed) return;
      if (readOnly) {
        pushReadOnlyHref(trimmed, navigate);
        return;
      }
      const resolution = resolveConsultationHrefNavigation(
        trimmed,
        activeAppointmentId,
        true,
      );
      if (resolution.kind === "noop" || resolution.kind === "allow_default") {
        return;
      }
      if (resolution.kind === "push") {
        navigate(resolution.destination);
        return;
      }
      pendingLinkNavigationHrefRef.current = resolution.destination;
      setLeaveDialogOpenInternal(true);
    },
    [
      readOnly,
      navigate,
      activeAppointmentId,
      pendingLinkNavigationHrefRef,
      setLeaveDialogOpenInternal,
    ],
  );
}

function pushReadOnlyHref(
  trimmedHref: string,
  navigate: ReturnType<typeof useNavigate>,
): void {
  const resolved = parseSameOriginAppNavigationUrl(trimmedHref);
  if (!resolved) return;
  navigate(`${resolved.pathname}${resolved.search}${resolved.hash}`);
}

export function useSaveAndLeave(params: {
  saveHandlesRef: RefObject<ConsultationSaveHandles | null>;
  navigateAway: (kind?: NavigateAwayKind) => void;
  setLeaveDialogOpenInternal: SetLeaveDialogOpen;
}) {
  const { saveHandlesRef, navigateAway, setLeaveDialogOpenInternal } = params;
  const [leaveBusy, setLeaveBusy] = useState(false);
  const saveAndLeave = useCallback(async () => {
    setLeaveBusy(true);
    try {
      const handles = saveHandlesRef.current;
      if (handles) {
        await handles.flush({ force: true });
        await handles.submitPrescriptions();
      }
      setLeaveDialogOpenInternal(false);
      useConsultationDraft.getState().clearConsultationLeaveGuard();
      navigateAway("leaveDialogCompleted");
    } finally {
      setLeaveBusy(false);
    }
  }, [navigateAway, saveHandlesRef, setLeaveDialogOpenInternal]);
  return { leaveBusy, saveAndLeave };
}

export function useLeaveWithoutSaving(params: {
  navigateAway: (kind?: NavigateAwayKind) => void;
  setLeaveDialogOpenInternal: SetLeaveDialogOpen;
}) {
  const { navigateAway, setLeaveDialogOpenInternal } = params;
  return useCallback(() => {
    setLeaveDialogOpenInternal(false);
    useConsultationDraft.getState().clearConsultationLeaveGuard();
    const runNavigateAway = () => navigateAway("leaveDialogCompleted");
    if (typeof window !== "undefined") {
      window.setTimeout(runNavigateAway, 0);
    } else {
      runNavigateAway();
    }
  }, [navigateAway, setLeaveDialogOpenInternal]);
}
