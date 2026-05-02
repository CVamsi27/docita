"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { readInAppNavCount } from "@/providers/navigation-history-provider";
import {
  consultationDraftNeedsLeaveGuard,
  useConsultationDraft,
} from "@/features/consultation/state/useConsultationDraft";

export type ConsultationSaveHandles = {
  flush: (opts?: { force?: boolean }) => Promise<boolean>;
  submitPrescriptions: () => Promise<boolean>;
};

type NavigateAwayKind = "default" | "leaveDialogCompleted";

/** Set on an `<a>` or ancestor to allow navigation without opening the leave dialog. */
export const CONSULTATION_LEAVE_GUARD_SKIP_ATTR =
  "data-docita-skip-consultation-leave-guard";

/** Same appointment detail route (any query/hash) — in-workspace navigation, not a leave. */
export function isSameConsultationAppointmentPathname(
  pathname: string,
  activeAppointmentId: string,
): boolean {
  return pathname === `/consultation/${activeAppointmentId}`;
}

type ConsultationHrefNavigationResolution =
  | { kind: "noop" }
  | { kind: "allow_default" }
  | { kind: "push"; destination: string }
  | { kind: "dialog"; destination: string };

const UNSAFE_NAVIGATION_PROTOCOLS = new Set([
  "javascript:",
  "mailto:",
  "tel:",
  "data:",
  "vbscript:",
  "blob:",
]);

/** Schemes blocked at capture (mailto/tel stay allowed for native handlers). */
const HREF_SCHEME_CAPTURE_DENY_PREFIXES = [
  "javascript",
  "vbscript",
  "data",
  "blob",
] as const;

const HREF_SCHEME_CAPTURE_DENY_PATTERN = new RegExp(
  `^(${HREF_SCHEME_CAPTURE_DENY_PREFIXES.join("|")}):`,
  "i",
);

function parseSameOriginAppNavigationUrl(trimmedHref: string): URL | null {
  if (typeof window === "undefined") return null;
  if (trimmedHref.includes("\0")) return null;
  let resolved: URL;
  try {
    resolved = new URL(trimmedHref, window.location.href);
  } catch {
    return null;
  }
  if (resolved.origin !== window.location.origin) return null;
  if (UNSAFE_NAVIGATION_PROTOCOLS.has(resolved.protocol)) return null;
  return resolved;
}

function resolveConsultationHrefNavigation(
  rawHref: string,
  activeAppointmentId: string,
  programmatic: boolean,
): ConsultationHrefNavigationResolution {
  if (typeof window === "undefined") return { kind: "noop" };
  const trimmedHref = rawHref.trim();
  if (!trimmedHref) return { kind: "noop" };
  const resolved = parseSameOriginAppNavigationUrl(trimmedHref);
  if (!resolved) return { kind: "noop" };

  const destination =
    `${resolved.pathname}${resolved.search}${resolved.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (destination === current) return { kind: "noop" };

  if (
    isSameConsultationAppointmentPathname(
      resolved.pathname,
      activeAppointmentId,
    )
  ) {
    return programmatic
      ? { kind: "push", destination }
      : { kind: "allow_default" };
  }

  if (!consultationDraftNeedsLeaveGuard(useConsultationDraft.getState())) {
    return programmatic
      ? { kind: "push", destination }
      : { kind: "allow_default" };
  }

  return { kind: "dialog", destination };
}

function peelConsultationLeaveHistoryTraps(
  pendingRef: MutableRefObject<number>,
  peelingRef: MutableRefObject<boolean>,
): void {
  if (typeof window === "undefined") return;
  const moves = pendingRef.current;
  if (moves <= 0) return;
  pendingRef.current = 0;
  peelingRef.current = true;
  try {
    for (let i = 0; i < moves; i += 1) {
      window.history.back();
    }
  } finally {
    peelingRef.current = false;
  }
}

interface UseConsultationLeaveNavigationOptions {
  readOnly: boolean;
  fallbackRoute: string;
  saveHandlesRef: RefObject<ConsultationSaveHandles | null>;
  /** Resets browser history traps when switching consultations. */
  activeAppointmentId: string;
}

export function useConsultationLeaveNavigation({
  readOnly,
  fallbackRoute,
  saveHandlesRef,
  activeAppointmentId,
}: UseConsultationLeaveNavigationOptions) {
  const router = useRouter();
  const [leaveDialogOpen, setLeaveDialogOpenInternal] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const pendingLeaveHistoryTrapsRef = useRef(0);
  /** True while peeling traps so `popstate` does not re-arm them (draft may still be dirty). */
  const peelingLeaveHistoryTrapsRef = useRef(false);
  const pendingLinkNavigationHrefRef = useRef<string | null>(null);
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;

  const onLeaveDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      pendingLinkNavigationHrefRef.current = null;
    }
    setLeaveDialogOpenInternal(open);
  }, []);

  const navigateAway = useCallback(
    (kind: NavigateAwayKind = "default") => {
      const pendingHref = pendingLinkNavigationHrefRef.current;
      pendingLinkNavigationHrefRef.current = null;
      if (pendingHref) {
        router.push(pendingHref);
        return;
      }
      if (kind === "leaveDialogCompleted") {
        router.push(fallbackRoute);
        return;
      }
      if (readInAppNavCount() > 1) {
        router.back();
        return;
      }
      router.push(fallbackRoute);
    },
    [fallbackRoute, router],
  );

  useEffect(() => {
    pendingLinkNavigationHrefRef.current = null;
    peelConsultationLeaveHistoryTraps(
      pendingLeaveHistoryTrapsRef,
      peelingLeaveHistoryTrapsRef,
    );
  }, [activeAppointmentId]);

  useEffect(() => {
    if (readOnly) {
      pendingLinkNavigationHrefRef.current = null;
      peelConsultationLeaveHistoryTraps(
        pendingLeaveHistoryTrapsRef,
        peelingLeaveHistoryTrapsRef,
      );
    }
  }, [readOnly]);

  useEffect(() => {
    return () => {
      pendingLinkNavigationHrefRef.current = null;
      peelConsultationLeaveHistoryTraps(
        pendingLeaveHistoryTrapsRef,
        peelingLeaveHistoryTrapsRef,
      );
    };
  }, []);

  useEffect(() => {
    if (readOnly) return;
    const armTrapIfGuardedAndNonePending = () => {
      if (readOnlyRef.current) return;
      if (pendingLeaveHistoryTrapsRef.current > 0) return;
      const st = useConsultationDraft.getState();
      if (!consultationDraftNeedsLeaveGuard(st)) return;
      window.history.pushState(null, "", window.location.href);
      pendingLeaveHistoryTrapsRef.current += 1;
    };
    armTrapIfGuardedAndNonePending();
    return useConsultationDraft.subscribe((state, prev) => {
      if (readOnlyRef.current) return;
      const need = consultationDraftNeedsLeaveGuard(state);
      const prevNeed = consultationDraftNeedsLeaveGuard(prev);
      if (need && !prevNeed) {
        window.history.pushState(null, "", window.location.href);
        pendingLeaveHistoryTrapsRef.current += 1;
      } else if (!need && prevNeed) {
        peelConsultationLeaveHistoryTraps(
          pendingLeaveHistoryTrapsRef,
          peelingLeaveHistoryTrapsRef,
        );
      }
    });
  }, [readOnly, activeAppointmentId]);

  useEffect(() => {
    if (readOnly || typeof window === "undefined") return;
    const onPopState = () => {
      if (readOnlyRef.current) return;
      if (peelingLeaveHistoryTrapsRef.current) return;
      if (!consultationDraftNeedsLeaveGuard(useConsultationDraft.getState())) {
        return;
      }
      pendingLinkNavigationHrefRef.current = null;
      window.history.pushState(null, "", window.location.href);
      pendingLeaveHistoryTrapsRef.current += 1;
      setLeaveDialogOpenInternal(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [readOnly]);

  useEffect(() => {
    if (readOnly || typeof document === "undefined") return;

    const handleCaptureClick = (event: MouseEvent) => {
      if (readOnlyRef.current) return;
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      if (event.button !== 0) return;

      const el = event.target;
      if (!(el instanceof Element)) return;

      const anchor = el.closest("a[href]");
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;

      if (anchor.closest(`[${CONSULTATION_LEAVE_GUARD_SKIP_ATTR}]`)) return;

      if (anchor.target === "_blank" || anchor.hasAttribute("download"))
        return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;
      const trimmedHref = rawHref.trim();
      if (!trimmedHref || trimmedHref.startsWith("#")) return;

      if (trimmedHref.includes("\0")) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (HREF_SCHEME_CAPTURE_DENY_PATTERN.test(trimmedHref)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const resolution = resolveConsultationHrefNavigation(
        trimmedHref,
        activeAppointmentId,
        false,
      );
      if (resolution.kind !== "dialog") return;

      event.preventDefault();
      event.stopPropagation();
      pendingLinkNavigationHrefRef.current = resolution.destination;
      setLeaveDialogOpenInternal(true);
    };

    document.addEventListener("click", handleCaptureClick, true);
    return () =>
      document.removeEventListener("click", handleCaptureClick, true);
  }, [readOnly, activeAppointmentId]);

  const tryNavigateAway = useCallback(() => {
    if (readOnly) {
      navigateAway();
      return;
    }
    const needsConfirmation = consultationDraftNeedsLeaveGuard(
      useConsultationDraft.getState(),
    );
    if (!needsConfirmation) {
      navigateAway();
      return;
    }
    pendingLinkNavigationHrefRef.current = null;
    setLeaveDialogOpenInternal(true);
  }, [readOnly, navigateAway]);

  const attemptNavigateToHref = useCallback(
    (rawHref: string) => {
      if (typeof window === "undefined") return;
      const trimmed = rawHref.trim();
      if (!trimmed) return;
      if (readOnly) {
        const resolved = parseSameOriginAppNavigationUrl(trimmed);
        if (!resolved) return;
        router.push(
          `${resolved.pathname}${resolved.search}${resolved.hash}`,
        );
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
        router.push(resolution.destination);
        return;
      }
      pendingLinkNavigationHrefRef.current = resolution.destination;
      setLeaveDialogOpenInternal(true);
    },
    [readOnly, router, activeAppointmentId],
  );

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
  }, [navigateAway, saveHandlesRef]);

  const leaveWithoutSaving = useCallback(() => {
    setLeaveDialogOpenInternal(false);
    useConsultationDraft.getState().clearConsultationLeaveGuard();
    const runNavigateAway = () => navigateAway("leaveDialogCompleted");
    if (typeof window !== "undefined") {
      window.setTimeout(runNavigateAway, 0);
    } else {
      runNavigateAway();
    }
  }, [navigateAway]);

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
