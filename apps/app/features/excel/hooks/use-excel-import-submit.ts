import { useCallback, useState } from "react";
import { toast } from "sonner";
import { fetchWithSession } from "@/lib/auth/fetch-with-session";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { ImportPreview, ImportResult } from "./excel-import-helpers";

export function useExcelImportSubmit(
  preview: ImportPreview | null,
  columnMappings: Record<string, string>,
) {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleImport = useCallback(async () => {
    if (!preview) return null;

    setIsImporting(true);
    setImportProgress(10);

    try {
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetchWithSession(
        `/imports/patients/${preview.sessionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ columnMapping: columnMappings }),
        },
      );

      clearInterval(progressInterval);
      setImportProgress(100);

      if (!response.ok) throw new Error("We could not import this file. Please try again.");

      const result: ImportResult = await response.json();
      setImportResult(result);

      if (result.success > 0) {
        toast.success(`Successfully imported ${result.success} patients`);
      }
      if (result.failed > 0 || result.duplicates > 0) {
        toast.warning(
          `${result.failed} failed, ${result.duplicates} duplicates skipped`,
        );
      }

      return result;
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not import this file. Please try again.",
        "upload",
      );
      return "rollback";
    } finally {
      setIsImporting(false);
    }
  }, [preview, columnMappings]);

  return {
    isImporting,
    importProgress,
    importResult,
    handleImport,
    setImportProgress,
    setImportResult,
  };
}
