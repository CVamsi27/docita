"use client";

import { useCallback, useState } from "react";
import { getAppApiUrl } from "@/lib/api/api-config";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

/**
 * Fetches the printable OPD prescription slip for an appointment and opens it in
 * a new tab. The slip endpoint streams a binary PDF, so we fetch it as a blob
 * (carrying the httpOnly auth cookie via `credentials: "include"`) rather than
 * routing through the JSON API client.
 */
export function useDownloadOpdSlip() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const download = useCallback(async (appointmentId: string) => {
    if (!appointmentId) return;
    setDownloadingId(appointmentId);
    try {
      const baseUrl = getAppApiUrl().replace(/\/$/, "");
      const response = await fetch(
        `${baseUrl}/appointments/${appointmentId}/opd-slip`,
        { credentials: "include" },
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
