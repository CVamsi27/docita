import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAppConfig } from "@/lib/contexts/app-config-context";
import { fetchWithSession } from "@/lib/auth/fetch-with-session";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  DEFAULT_PATIENT_IMPORT_FIELDS,
  hasRequiredMappings as hasRequiredMappingsHelper,
  type ColumnMapping,
  type ImportPreview,
  type ImportResult,
  type Step,
} from "./excel-import-helpers";

export type { ColumnMapping, ImportPreview, ImportResult, Step };

export const useExcelImport = () => {
  const { config } = useAppConfig();

  const DB_FIELDS =
    config.patientImportFields.length > 0
      ? config.patientImportFields
      : DEFAULT_PATIENT_IMPORT_FIELDS;

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>(
    {},
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setPreview(null);
        setColumnMappings({});
      }
    },
    [],
  );

  const handleUpload = async () => {
    if (!file) return;

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
      setPreview(data);
      setColumnMappings(data.suggestedMappings);
      setStep("mapping");
      toast.success(`Found ${data.totalRows} rows to import`);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not preview this file. Please try again.",
        "upload",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const updateMapping = (excelColumn: string, dbField: string | null) => {
    setColumnMappings((prev) => {
      const updated = { ...prev };
      if (dbField) {
        updated[excelColumn] = dbField;
      } else {
        delete updated[excelColumn];
      }
      return updated;
    });
  };

  const hasRequiredMappings = useCallback(
    () => hasRequiredMappingsHelper(columnMappings),
    [columnMappings],
  );

  const handleImport = async () => {
    if (!preview) return;

    setIsImporting(true);
    setStep("importing");
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
      setStep("results");

      if (result.success > 0) {
        toast.success(`Successfully imported ${result.success} patients`);
      }
      if (result.failed > 0 || result.duplicates > 0) {
        toast.warning(
          `${result.failed} failed, ${result.duplicates} duplicates skipped`,
        );
      }
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not import this file. Please try again.",
        "upload",
      );
      setStep("mapping");
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setColumnMappings({});
    setImportResult(null);
    setImportProgress(0);
  };

  return {
    step,
    file,
    preview,
    columnMappings,
    isUploading,
    isImporting,
    importResult,
    importProgress,
    DB_FIELDS,
    handleFileChange,
    handleUpload,
    updateMapping,
    hasRequiredMappings,
    handleImport,
    handleReset,
  };
};
