import type { AskAiScope } from "./ask-ai-context";

/**
 * Derives a contextual Ask AI scope from the current pathname when the overlay
 * is opened from a global trigger (sidebar, topbar, ⌘J) rather than a page header.
 */
export function resolveAskAiScopeFromPathname(
  pathname: string,
): AskAiScope | undefined {
  if (pathname === "/today" || pathname.startsWith("/today/")) {
    return { id: "today", label: "on today's workspace" };
  }

  if (pathname === "/appointments" || pathname.startsWith("/appointments/")) {
    return {
      id: "appointments",
      label: "on appointments",
      payload: { kind: "appointments" },
    };
  }

  const patientMatch = pathname.match(/^\/patients\/([^/]+)/);
  if (patientMatch?.[1]) {
    const patientId = patientMatch[1];
    return {
      id: `patient:${patientId}`,
      label: "on this patient",
      payload: { kind: "patient", patientId },
    };
  }

  const consultationMatch = pathname.match(/^\/consultation\/([^/]+)/);
  if (consultationMatch?.[1]) {
    const appointmentId = consultationMatch[1];
    return {
      id: `consultation:${appointmentId}`,
      label: `on Consultation #${appointmentId.slice(0, 8)}`,
      payload: { appointmentId },
    };
  }

  return undefined;
}
