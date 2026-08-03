import { useCallback, useState } from "react";
import { downloadOpdSlipPdf } from "@/features/appointments/api/opd-slip.api";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

/**
 * Fetches the printable OPD prescription slip for an appointment and opens it
 * in a new tab. The slip endpoint streams a binary PDF, so the download runs
 * through the feature `api/` adapter (see `opd-slip.api.ts`) rather than the
 * JSON data-access layer, which has no blob support.
 */
export function useDownloadOpdSlip() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const download = useCallback(async (appointmentId: string) => {
    if (!appointmentId) return;
    setDownloadingId(appointmentId);
    try {
      const blob = await downloadOpdSlipPdf(appointmentId);
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
