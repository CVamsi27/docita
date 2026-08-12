import { useEffect } from "react";
import {
  consultationDraftNeedsLeaveGuard,
  useConsultationDraft,
} from "@/features/consultation/state/useConsultationDraft";
import {
  CONSULTATION_LEAVE_GUARD_SKIP_ATTR,
  HREF_SCHEME_CAPTURE_DENY_PATTERN,
  resolveConsultationHrefNavigation,
} from "@/features/consultation/workspace/consultation-leave-navigation-helpers";
import {
  armHistoryTrap,
  peelConsultationLeaveHistoryTraps,
} from "@/features/consultation/workspace/consultation-leave-helpers";
import type {
  PeelingHistoryTrapsRef,
  PendingHistoryTrapsRef,
  PendingHrefRef,
  ReadOnlyRef,
  SetLeaveDialogOpen,
} from "./consultation-leave-navigation-types";

export function useLeaveTrapReset(params: {
  readOnly: boolean;
  activeAppointmentId: string;
  pendingLinkNavigationHrefRef: PendingHrefRef;
  pendingLeaveHistoryTrapsRef: PendingHistoryTrapsRef;
  peelingLeaveHistoryTrapsRef: PeelingHistoryTrapsRef;
}) {
  const {
    readOnly,
    activeAppointmentId,
    pendingLinkNavigationHrefRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
  } = params;
  useEffect(() => {
    resetLeaveHistoryTraps({
      pendingLinkNavigationHrefRef,
      pendingLeaveHistoryTrapsRef,
      peelingLeaveHistoryTrapsRef,
    });
  }, [
    activeAppointmentId,
    pendingLinkNavigationHrefRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
  ]);
  useEffect(() => {
    if (!readOnly) return;
    resetLeaveHistoryTraps({
      pendingLinkNavigationHrefRef,
      pendingLeaveHistoryTrapsRef,
      peelingLeaveHistoryTrapsRef,
    });
  }, [
    readOnly,
    pendingLinkNavigationHrefRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
  ]);
  useEffect(() => {
    return () => {
      resetLeaveHistoryTraps({
        pendingLinkNavigationHrefRef,
        pendingLeaveHistoryTrapsRef,
        peelingLeaveHistoryTrapsRef,
      });
    };
  }, [
    pendingLinkNavigationHrefRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
  ]);
}

function resetLeaveHistoryTraps(params: {
  pendingLinkNavigationHrefRef: PendingHrefRef;
  pendingLeaveHistoryTrapsRef: PendingHistoryTrapsRef;
  peelingLeaveHistoryTrapsRef: PeelingHistoryTrapsRef;
}): void {
  params.pendingLinkNavigationHrefRef.current = null;
  peelConsultationLeaveHistoryTraps(
    params.pendingLeaveHistoryTrapsRef,
    params.peelingLeaveHistoryTrapsRef,
  );
}

export function useDraftHistoryTrapSubscription(params: {
  readOnly: boolean;
  activeAppointmentId: string;
  readOnlyRef: ReadOnlyRef;
  pendingLeaveHistoryTrapsRef: PendingHistoryTrapsRef;
  peelingLeaveHistoryTrapsRef: PeelingHistoryTrapsRef;
}) {
  const {
    readOnly,
    activeAppointmentId,
    readOnlyRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
  } = params;
  useEffect(() => {
    if (readOnly) return;
    if (
      !readOnlyRef.current &&
      pendingLeaveHistoryTrapsRef.current === 0 &&
      consultationDraftNeedsLeaveGuard(useConsultationDraft.getState())
    ) {
      armHistoryTrap(pendingLeaveHistoryTrapsRef);
    }
    return useConsultationDraft.subscribe((state, prev) => {
      if (readOnlyRef.current) return;
      const need = consultationDraftNeedsLeaveGuard(state);
      const prevNeed = consultationDraftNeedsLeaveGuard(prev);
      if (need && !prevNeed) {
        armHistoryTrap(pendingLeaveHistoryTrapsRef);
      } else if (!need && prevNeed) {
        peelConsultationLeaveHistoryTraps(
          pendingLeaveHistoryTrapsRef,
          peelingLeaveHistoryTrapsRef,
        );
      }
    });
  }, [
    readOnly,
    activeAppointmentId,
    readOnlyRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
  ]);
}

export function usePopstateLeaveGuard(params: {
  readOnly: boolean;
  readOnlyRef: ReadOnlyRef;
  pendingLinkNavigationHrefRef: PendingHrefRef;
  pendingLeaveHistoryTrapsRef: PendingHistoryTrapsRef;
  peelingLeaveHistoryTrapsRef: PeelingHistoryTrapsRef;
  setLeaveDialogOpenInternal: SetLeaveDialogOpen;
}) {
  const {
    readOnly,
    readOnlyRef,
    pendingLinkNavigationHrefRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
    setLeaveDialogOpenInternal,
  } = params;
  useEffect(() => {
    if (readOnly || typeof window === "undefined") return;
    const onPopState = () => {
      if (!shouldOpenDialogForPopstate(readOnlyRef, peelingLeaveHistoryTrapsRef)) {
        return;
      }
      pendingLinkNavigationHrefRef.current = null;
      armHistoryTrap(pendingLeaveHistoryTrapsRef);
      setLeaveDialogOpenInternal(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [
    readOnly,
    readOnlyRef,
    pendingLinkNavigationHrefRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
    setLeaveDialogOpenInternal,
  ]);
}

function shouldOpenDialogForPopstate(
  readOnlyRef: ReadOnlyRef,
  peelingLeaveHistoryTrapsRef: PeelingHistoryTrapsRef,
): boolean {
  if (readOnlyRef.current) return false;
  if (peelingLeaveHistoryTrapsRef.current) return false;
  return consultationDraftNeedsLeaveGuard(useConsultationDraft.getState());
}

export function useLinkClickLeaveGuard(params: {
  readOnly: boolean;
  activeAppointmentId: string;
  readOnlyRef: ReadOnlyRef;
  pendingLinkNavigationHrefRef: PendingHrefRef;
  setLeaveDialogOpenInternal: SetLeaveDialogOpen;
}) {
  const {
    readOnly,
    activeAppointmentId,
    readOnlyRef,
    pendingLinkNavigationHrefRef,
    setLeaveDialogOpenInternal,
  } = params;
  useEffect(() => {
    if (readOnly || typeof document === "undefined") return;
    const handleCaptureClick = (event: MouseEvent) => {
      if (shouldIgnoreCaptureClick(event, readOnlyRef)) return;
      const trimmedHref = readCapturedNavigationHref(event);
      if (!trimmedHref) return;
      const resolution = resolveConsultationHrefNavigation(
        trimmedHref,
        activeAppointmentId,
        false,
      );
      if (resolution.kind !== "dialog") return;
      blockCapturedNavigation(event);
      pendingLinkNavigationHrefRef.current = resolution.destination;
      setLeaveDialogOpenInternal(true);
    };
    document.addEventListener("click", handleCaptureClick, true);
    return () =>
      document.removeEventListener("click", handleCaptureClick, true);
  }, [
    readOnly,
    activeAppointmentId,
    readOnlyRef,
    pendingLinkNavigationHrefRef,
    setLeaveDialogOpenInternal,
  ]);
}

function shouldIgnoreCaptureClick(
  event: MouseEvent,
  readOnlyRef: ReadOnlyRef,
): boolean {
  if (readOnlyRef.current) return true;
  if (event.defaultPrevented) return true;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return true;
  return event.button !== 0;
}

function readCapturedNavigationHref(event: MouseEvent): string | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a[href]");
  if (!anchor || !(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.closest(`[${CONSULTATION_LEAVE_GUARD_SKIP_ATTR}]`)) return null;
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return null;
  const rawHref = anchor.getAttribute("href");
  if (!rawHref) return null;
  const trimmedHref = rawHref.trim();
  if (!trimmedHref || trimmedHref.startsWith("#")) return null;
  if (
    trimmedHref.includes("\0") ||
    HREF_SCHEME_CAPTURE_DENY_PATTERN.test(trimmedHref)
  ) {
    blockCapturedNavigation(event);
    return null;
  }
  return trimmedHref;
}

function blockCapturedNavigation(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}
