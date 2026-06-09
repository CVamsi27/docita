import { useCallback, useState } from "react";
import { useAppConfig } from "@/lib/contexts/app-config-context";
import {
  DEFAULT_PATIENT_IMPORT_FIELDS,
  hasRequiredMappings as hasRequiredMappingsHelper,
  type ColumnMapping,
  type ImportPreview,
  type ImportResult,
  type Step,
} from "./excel-import-helpers";
import { useExcelUpload } from "./use-excel-upload";
import { useExcelImportSubmit } from "./use-excel-import-submit";

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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const { isUploading, handleUpload: doUpload } = useExcelUpload(file);
  const { isImporting, importProgress, handleImport: doImport } =
    useExcelImportSubmit(preview, columnMappings);

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

  const handleUpload = useCallback(async () => {
    const result = await doUpload();
    if (result) {
      setPreview(result.preview);
      setColumnMappings(result.suggestedMappings);
      setStep("mapping");
    }
  }, [doUpload]);

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

  const handleImport = useCallback(async () => {
    const result = await doImport();
    if (result === "rollback") {
      setStep("mapping");
    } else if (result) {
      setImportResult(result);
      setStep("results");
    }
  }, [doImport]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setColumnMappings({});
    setImportResult(null);
  }, []);

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
