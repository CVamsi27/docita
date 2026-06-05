"use client";

import { useCallback, useState } from "react";
import { fetchWithSession } from "@/lib/auth/fetch-with-session";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

/**
 * Fetches the printable OPD prescription slip for an appointment and opens it in
 * a new tab. The slip endpoint streams a binary PDF, so we read it as a blob
 * via the session-aware wrapper rather than routing through the JSON API client.
 */
export function useDownloadOpdSlip() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const download = useCallback(async (appointmentId: string) => {
    if (!appointmentId) return;
    setDownloadingId(appointmentId);
    try {
      const response = await fetchWithSession(
        `/appointments/${appointmentId}/opd-slip`,
      );
      if (!response.ok) {
        throw new Error(
          "We could not generate the OPD prescription slip. Please try again.",
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      // Revoke after the tab has had a chance to load the document.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not generate the OPD prescription slip. Please try again.",
        "load",
      );
    } finally {
      setDownloadingId(null);
    }
  }, []);

  return { download, downloadingId };
}
