import {
  consultationDraftNeedsLeaveGuard,
  useConsultationDraft,
} from "@/features/consultation/state/useConsultationDraft";

export const CONSULTATION_LEAVE_GUARD_SKIP_ATTR =
  "data-docita-skip-consultation-leave-guard";

function isSameConsultationAppointmentPathname(
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

const HREF_SCHEME_CAPTURE_DENY_PREFIXES = [
  "javascript",
  "vbscript",
  "data",
  "blob",
] as const;

export const HREF_SCHEME_CAPTURE_DENY_PATTERN = new RegExp(
  `^(${HREF_SCHEME_CAPTURE_DENY_PREFIXES.join("|")}):`,
  "i",
);

export function parseSameOriginAppNavigationUrl(trimmedHref: string): URL | null {
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

export function resolveConsultationHrefNavigation(
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
