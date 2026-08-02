import { useCallback, useEffect, useState } from "react";
import type { UploadResult } from "@workspace/data-access";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { uploadSignature, validateToken } from "../lib/signature-helpers";

interface UploadSignatureTokenState {
  validating: boolean;
  tokenValid: boolean;
  doctorName: string;
  error: string | null;
  uploading: boolean;
  uploadComplete: boolean;
  uploadResult: UploadResult | null;
}

interface UploadSignatureTokenActions {
  handleUpload: (file: File) => Promise<void>;
  setError: (error: string | null) => void;
}

export function useUploadSignatureToken(
  token: string,
): UploadSignatureTokenState & UploadSignatureTokenActions {
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const validation = await validateToken(token);
        setTokenValid(true);
        setDoctorName(validation.doctor?.name ?? "");
      } catch (err) {
        setError(
          getUserFacingErrorMessage(err, {
            fallback: "This upload link is no longer available",
            context: "verification",
          }),
        );
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };

    if (token) {
      void checkToken();
    }
  }, [token]);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);

      try {
        const result = await uploadSignature(token, file);
        setUploadResult(result);
        setUploadComplete(true);
      } catch (err) {
        setError(
          getUserFacingErrorMessage(err, {
            fallback: "We could not upload this signature. Please try again.",
            context: "upload",
          }),
        );
      } finally {
        setUploading(false);
      }
    },
    [token],
  );

  return {
    validating,
    tokenValid,
    doctorName,
    error,
    setError,
    uploading,
    uploadComplete,
    uploadResult,
    handleUpload,
  };
}
