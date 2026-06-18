import { useCallback, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { uploadFileToSession } from "@/lib/api/upload-session";
import { resolveUploadErrorPresentation } from "./mobile-upload-error-helpers";

/**
 * Owns the mobile-upload page's session/file/mutation state: resolves the
 * session id and upload secret from the route, tracks the selected file and
 * preview, runs the upload mutation, and maps failures to user-facing
 * messages via `resolveUploadErrorPresentation`.
 */
export function useMobileUpload() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const sessionId = params.id ?? "";
  const uploadSecretFromQuery = useMemo(
    () => searchParams.get("uploadSecret"),
    [searchParams],
  );
  const [file, setFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      const secret = uploadSecretFromQuery?.trim();
      if (!secret) throw new Error("Missing upload credentials in this link.");

      return await uploadFileToSession({
        sessionId,
        uploadSecret: secret,
        file: selectedFile,
        suppressGlobalErrorToast: true,
      });
    },
  });

  const handleFileSelect = useCallback(
    (selectedFile: File | null, url: string | null) => {
      setFile(selectedFile);
      setPreviewUrl(url);
      setErrorMessage(null);
    },
    [],
  );

  const showUploadMessage = (message: string, reportable: unknown) => {
    setErrorMessage(message);
    showUserFacingErrorToast(reportable, message, "upload");
  };

  const handleUpload = async () => {
    if (!file || !sessionId) return;

    setErrorMessage(null);
    try {
      const data = await uploadMutation.mutateAsync(file);
      if (data.status === "uploaded" && data.fileUrl) {
        setSuccess(true);
      } else {
        showUploadMessage(
          "Your upload finished, but we could not confirm it. Please try again.",
          null,
        );
      }
    } catch (error) {
      const { message, reportable } = resolveUploadErrorPresentation(error);
      showUploadMessage(message, reportable);
    }
  };

  return {
    sessionId,
    uploadSecretFromQuery,
    file,
    success,
    previewUrl,
    errorMessage,
    isUploading: uploadMutation.isPending,
    handleFileSelect,
    handleUpload,
  };
}
