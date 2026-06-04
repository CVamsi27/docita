import { type MutableRefObject } from "react";

export type NavigateAwayKind = "default" | "leaveDialogCompleted";

export function armHistoryTrap(
  pendingRef: MutableRefObject<number>,
): void {
  if (typeof window === "undefined") return;
  window.history.pushState(null, "", window.location.href);
  pendingRef.current += 1;
}

export function peelConsultationLeaveHistoryTraps(
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
