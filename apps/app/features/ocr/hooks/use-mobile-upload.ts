import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/api-client";
import { browserBlob } from "@/lib/auth/browser-request";
import { toAbsoluteAppUrl } from "@/lib/utils/url";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

function resolveUploadedFileUrl(fileUrl: string): string {
  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }
  return toAbsoluteAppUrl(fileUrl);
}

export const useMobileUpload = () => {
  const [showQr, setShowQr] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const pollSession = useCallback(
    async (id: string, onUploadComplete: (file: File, url: string) => void) => {
      clearPolling();
      pollIntervalRef.current = setInterval(async () => {
        try {
          const cacheBuster = Date.now();
          const data = await apiFetch<{ status?: string; fileUrl?: string }>(
            `/uploads/session/${id}?t=${cacheBuster}`,
            {
              method: "GET",
              cache: "no-store",
              headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                Pragma: "no-cache",
              },
            },
          );

          if (data.status === "uploaded" && data.fileUrl) {
            clearPolling();
            setShowQr(false);
            const downloadUrl = resolveUploadedFileUrl(data.fileUrl);
            const fileBlob = await browserBlob(downloadUrl, {
              credentials: "include",
              cache: "no-store",
            });
            const parsedUrl = new URL(downloadUrl);
            const filename =
              decodeURIComponent(parsedUrl.pathname.split("/").pop() || "") ||
              "uploaded-file";

            const file = new File([fileBlob], filename, {
              type: fileBlob.type || "application/octet-stream",
            });
            onUploadComplete(file, downloadUrl);
          }
        } catch (_e) {
          return;
        }
      }, 2000);

      pollTimeoutRef.current = setTimeout(() => {
        clearPolling();
        toast.message(
          "Mobile upload timed out. Please generate a new QR code.",
        );
      }, 120000);
    },
    [clearPolling],
  );

  const startMobileUpload = useCallback(
    async (onUploadComplete: (file: File, url: string) => void) => {
      try {
        const data = await apiFetch<{ id: string; uploadSecret: string }>(
          `/uploads/session`,
          {
            method: "POST",
          },
        );

        setQrUrl(
          toAbsoluteAppUrl(
            `/mobile-upload/${data.id}?uploadSecret=${encodeURIComponent(data.uploadSecret)}`,
          ),
        );
        setShowQr(true);
        pollSession(data.id, onUploadComplete);
      } catch (_error) {
        showUserFacingErrorToast(
          "We could not start the mobile upload right now. Please try again.",
        );
      }
    },
    [pollSession],
  );

  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  return {
    showQr,
    setShowQr,
    qrUrl,
    startMobileUpload,
  };
};
