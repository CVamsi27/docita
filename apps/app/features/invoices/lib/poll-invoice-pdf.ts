import { toast } from "sonner";
import { invoicesApi } from "@/features/invoices/api/invoices.api";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { safeOpenSignedUrl } from "@/lib/security/signed-url-validator";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

export async function pollInvoicePdfUrl(
  invoiceId: string,
  signal?: AbortSignal,
): Promise<void> {
  const toastId = toast.loading("Preparing PDF\u2026");
  try {
    const { jobId } = await invoicesApi.enqueuePdf(invoiceId);

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (signal?.aborted) return;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const status = await invoicesApi.getPdfStatus(invoiceId, jobId);

      if (status.status === "COMPLETED" && status.pdfUrl) {
        toast.dismiss(toastId);
        toast.success("PDF ready");
        safeOpenSignedUrl(status.pdfUrl);
        return;
      }

      if (status.status === "FAILED") throw new Error("PDF generation failed");
    }

    throw new Error("PDF generation timed out");
  } catch {
    toast.dismiss(toastId);
    showUserFacingErrorToast(
      "We could not download this invoice. Please try again.",
    );
  }
}
