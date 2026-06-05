"use client";

import { useRef, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { CONSULTATION_LEAVE_GUARD_SKIP_ATTR } from "@/features/consultation/workspace/consultation-leave-navigation-helpers";
import {
  useAttemptNavigateToHref,
  useLeaveDialogState,
  useLeaveWithoutSaving,
  useNavigateAway,
  useSaveAndLeave,
  useTryNavigateAway,
} from "./consultation-leave-navigation-actions";
import {
  useDraftHistoryTrapSubscription,
  useLeaveTrapReset,
  useLinkClickLeaveGuard,
  usePopstateLeaveGuard,
} from "./consultation-leave-navigation-effects";
import type {
  ConsultationSaveHandles,
} from "./consultation-leave-navigation-types";

export { CONSULTATION_LEAVE_GUARD_SKIP_ATTR };
export type {
  ConsultationSaveHandles,
  PeelingHistoryTrapsRef,
  PendingHistoryTrapsRef,
  PendingHrefRef,
  ReadOnlyRef,
  SetLeaveDialogOpen,
} from "./consultation-leave-navigation-types";

interface UseConsultationLeaveNavigationOptions {
  readOnly: boolean;
  fallbackRoute: string;
  saveHandlesRef: RefObject<ConsultationSaveHandles | null>;
  activeAppointmentId: string;
}

export function useConsultationLeaveNavigation({
  readOnly,
  fallbackRoute,
  saveHandlesRef,
  activeAppointmentId,
}: UseConsultationLeaveNavigationOptions) {
  const router = useRouter();
  const pendingLeaveHistoryTrapsRef = useRef(0);
  const peelingLeaveHistoryTrapsRef = useRef(false);
  const pendingLinkNavigationHrefRef = useRef<string | null>(null);
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  const { leaveDialogOpen, setLeaveDialogOpenInternal, onLeaveDialogOpenChange } =
    useLeaveDialogState(pendingLinkNavigationHrefRef);
  const navigateAway = useNavigateAway({
    router,
    fallbackRoute,
    pendingLinkNavigationHrefRef,
  });

  useLeaveTrapReset({
    readOnly,
    activeAppointmentId,
    pendingLinkNavigationHrefRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
  });
  useDraftHistoryTrapSubscription({
    readOnly,
    activeAppointmentId,
    readOnlyRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
  });
  usePopstateLeaveGuard({
    readOnly,
    readOnlyRef,
    pendingLinkNavigationHrefRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
    setLeaveDialogOpenInternal,
  });
  useLinkClickLeaveGuard({
    readOnly,
    activeAppointmentId,
    readOnlyRef,
    pendingLinkNavigationHrefRef,
    setLeaveDialogOpenInternal,
  });

  const tryNavigateAway = useTryNavigateAway({
    readOnly,
    navigateAway,
    pendingLinkNavigationHrefRef,
    setLeaveDialogOpenInternal,
  });
  const attemptNavigateToHref = useAttemptNavigateToHref({
    readOnly,
    router,
    activeAppointmentId,
    pendingLinkNavigationHrefRef,
    setLeaveDialogOpenInternal,
  });
  const { leaveBusy, saveAndLeave } = useSaveAndLeave({
    saveHandlesRef,
    navigateAway,
    setLeaveDialogOpenInternal,
  });
  const leaveWithoutSaving = useLeaveWithoutSaving({
    navigateAway,
    setLeaveDialogOpenInternal,
  });

  return {
    tryNavigateAway,
    attemptNavigateToHref,
    leaveDialogOpen,
    onLeaveDialogOpenChange,
    leaveBusy,
    saveAndLeave,
    leaveWithoutSaving,
    navigateAway,
  };
}
