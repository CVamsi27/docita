import { useCallback, useState } from "react";
import { apiPath, getAuthHeaders } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

/**
 * Fetches the printable OPD prescription slip for an appointment and opens it
 * in a new tab. The slip endpoint streams a binary PDF, so we read it as a
 * blob via the session-aware wrapper rather than routing through the JSON
 * API client. The data-access layer is designed for JSON responses and
 * doesn't support binary blob downloads, so inline fetch with auth headers
 * is the correct pattern here.
 */
export function useDownloadOpdSlip() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const download = useCallback(async (appointmentId: string) => {
    if (!appointmentId) return;
    setDownloadingId(appointmentId);
    try {
      const response = await fetch(
        apiPath(`/appointments/${appointmentId}/opd-slip`),
        {
          headers: getAuthHeaders(),
        },
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
