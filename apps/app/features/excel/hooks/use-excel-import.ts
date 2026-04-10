import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAppConfig } from "@/lib/app-config-context";
import { fetchWithSession } from "@/lib/fetch-with-session";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

export interface ColumnMapping {
  excelColumn: string;
  dbField: string | null;
  sampleValues: string[];
}

export interface ImportPreview {
  sessionId: string;
  columns: ColumnMapping[];
  suggestedMappings: Record<string, string>;
  totalRows: number;
  sampleData: Record<string, string | number | null>[];
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  duplicates: number;
  errors: string[];
  duplicateDetails: Array<{
    row: number;
    reason: string;
    existingPatient?: { id: string; name: string; phone: string };
  }>;
}

export type Step = "upload" | "mapping" | "importing" | "results";

export const useExcelImport = () => {
  const { config } = useAppConfig();

  const DB_FIELDS =
    config.patientImportFields.length > 0
      ? config.patientImportFields
      : [
          {
            field: "firstName",
            label: "First Name",
            required: true,
            type: "text",
          },
          {
            field: "lastName",
            label: "Last Name",
            required: false,
            type: "text",
          },
          {
            field: "phoneNumber",
            label: "Phone Number",
            required: true,
            type: "phone",
          },
          { field: "email", label: "Email", required: false, type: "email" },
          {
            field: "dateOfBirth",
            label: "Date of Birth",
            required: false,
            type: "date",
          },
          { field: "gender", label: "Gender", required: false, type: "select" },
          {
            field: "bloodGroup",
            label: "Blood Group",
            required: false,
            type: "select",
          },
          {
            field: "address",
            label: "Address",
            required: false,
            type: "textarea",
          },
          {
            field: "allergies",
            label: "Allergies",
            required: false,
            type: "text",
          },
          {
            field: "medicalHistory",
            label: "Medical History",
            required: false,
            type: "textarea",
          },
        ];

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

      if (!response.ok) {
        throw new Error("We could not preview the file. Please try again.");
      }

      const data: ImportPreview = await response.json();
      setPreview(data);
      setColumnMappings(data.suggestedMappings);
      setStep("mapping");
      toast.success(`Found ${data.totalRows} rows to import`);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not preview the file. Please try again.",
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

  const hasRequiredMappings = () => {
    const mappedFields = Object.values(columnMappings);
    return (
      mappedFields.includes("firstName") && mappedFields.includes("phoneNumber")
    );
  };

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

      if (!response.ok) {
        throw new Error("We could not import the file. Please try again.");
      }

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
        "We could not import the file. Please try again.",
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
