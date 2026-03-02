import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api-client";

export const useMobileUpload = () => {
  const [showQr, setShowQr] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const pollSession = useCallback(
    async (id: string, onUploadComplete: (file: File, url: string) => void) => {
      const API_URL =
        process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";

      const interval = setInterval(async () => {
        try {

          const cacheBuster = Date.now();
          const response = await fetch(
            `${API_URL}/uploads/session/${id}?t=${cacheBuster}`,
            {
              method: "GET",
              headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                Pragma: "no-cache",
              },
            },
          );

          if (!response.ok) {

            return;
          }

          const data = await response.json();

          if (data.status === "uploaded" && data.fileUrl) {
            clearInterval(interval);
            setShowQr(false);

            const filename = data.fileUrl.split("/").pop();

            const baseUrl = API_URL.replace(/\/api\/?$/, "");
            const realUrl = `${baseUrl}/uploads/temp/${filename}`;

            fetch(realUrl)
              .then((res) => res.blob())
              .then((blob) => {
                const file = new File([blob], filename || "uploaded-file", {
                  type: blob.type,
                });
                onUploadComplete(file, realUrl);
              })
              .catch(() => {
                alert("Uploaded file detected but could not be downloaded");
              });
          }
        } catch (_e) {
          return;
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(interval);
      }, 120000);
    },
    [],
  );

  const startMobileUpload = useCallback(
    async (onUploadComplete: (file: File, url: string) => void) => {
      try {
        const data = await apiFetch<{ id: string }>(`/uploads/session`, {
          method: "POST",
        });

        const origin = window.location.origin;
        setQrUrl(`${origin}/mobile-upload/${data.id}`);
        setShowQr(true);
        pollSession(data.id, onUploadComplete);
      } catch (_error) {
        alert("Could not start mobile session");
      }
    },
    [pollSession],
  );

  return {
    showQr,
    setShowQr,
    qrUrl,
    startMobileUpload,
  };
};
