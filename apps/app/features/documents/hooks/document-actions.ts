import type { Document } from "@workspace/types";
import { browserRequest } from "@/lib/auth/browser-request";
import { logger } from "@/lib/monitoring/logger";
import { validateSignedUrl } from "@/lib/security/signed-url-validator";

export function viewDocument(document: Document): void {
  if (document.url) {
    window.open(document.url, "_blank");
  }
}

export async function downloadDocument(document: Document): Promise<void> {
  if (!document.url) return;
  const validation = validateSignedUrl(document.url);
  if (!validation.valid) {
    logger.warn("Blocked download of document with invalid URL", {
      documentId: document.id,
      reason: validation.reason,
    });
    return;
  }

  try {
    const response = await browserRequest(document.url);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download =
      document.name || document.filename || document.title || "document";
    window.document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    window.document.body.removeChild(anchor);
  } catch (error) {
    logger.error("Failed to download document", { error });
  }
}
