import { useEffect, useState } from "react";
import type { EffectivePermissionsResponse } from "@workspace/types";
import { fetchEffectivePermissions } from "@/lib/api/effective-permissions.api";

/**
 * C7 (ADR-0013): loads the server permission snapshot once per session.
 * Non-blocking and failure-tolerant: returns null until loaded (or forever on
 * error / unauthenticated) so callers fall back to the local matrix — the
 * documented offline fallback. The snapshot only previews decisions; the
 * server remains the enforcement point.
 */
let cachedSnapshot: EffectivePermissionsResponse | null | undefined;

export function useEffectivePermissions():
  | EffectivePermissionsResponse
  | null {
  const [snapshot, setSnapshot] = useState<
    EffectivePermissionsResponse | null
  >(() => (cachedSnapshot === undefined ? null : cachedSnapshot));

  useEffect(() => {
    if (cachedSnapshot !== undefined) {
      if (cachedSnapshot !== null) setSnapshot(cachedSnapshot);
      return;
    }
    let active = true;
    fetchEffectivePermissions()
      .then((value) => {
        cachedSnapshot = value;
        if (active) setSnapshot(value);
      })
      .catch(() => {
        // Offline / error fallback: keep the local matrix evaluation.
        cachedSnapshot = null;
        if (active) setSnapshot(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return snapshot;
}
