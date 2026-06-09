import { useCallback, useState } from "react";
import { toast } from "sonner";
import { fetchWithSession } from "@/lib/auth/fetch-with-session";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { ImportPreview } from "./excel-import-helpers";

export function useExcelUpload(file: File | null) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = useCallback(async (): Promise<{
    preview: ImportPreview;
    suggestedMappings: Record<string, string>;
  } | null> => {
    if (!file) return null;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetchWithSession("/imports/preview", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("We could not preview this file. Please try again.");

      const data: ImportPreview = await response.json();
      toast.success(`Found ${data.totalRows} rows to import`);
      return { preview: data, suggestedMappings: data.suggestedMappings };
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not preview this file. Please try again.",
        "upload",
      );
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [file]);

  return { isUploading, handleUpload };
}
