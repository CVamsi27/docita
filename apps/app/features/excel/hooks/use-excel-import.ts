import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useAppConfig } from "@/lib/app-config-context";

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
    const { token } = useAuth();
    const { config } = useAppConfig();

    // Get patient import fields from config
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

    const apiUrl =
        process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";

    // Handle file selection
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

    // Upload and get preview
    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(`${apiUrl}/imports/preview`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to preview file");
            }

            const data: ImportPreview = await response.json();
            setPreview(data);
            setColumnMappings(data.suggestedMappings);
            setStep("mapping");
            toast.success(`Found ${data.totalRows} rows to import`);
        } catch (error) {
            toast.error((error as Error).message || "Failed to upload file");
        } finally {
            setIsUploading(false);
        }
    };

    // Update column mapping
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

    // Check if required fields are mapped
    const hasRequiredMappings = () => {
        const mappedFields = Object.values(columnMappings);
        return (
            mappedFields.includes("firstName") && mappedFields.includes("phoneNumber")
        );
    };

    // Start import
    const handleImport = async () => {
        if (!preview) return;

        setIsImporting(true);
        setStep("importing");
        setImportProgress(10);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setImportProgress((prev) => Math.min(prev + 10, 90));
            }, 500);

            const response = await fetch(
                `${apiUrl}/imports/patients/${preview.sessionId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ columnMapping: columnMappings }),
                },
            );

            clearInterval(progressInterval);
            setImportProgress(100);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Import failed");
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
            toast.error((error as Error).message || "Import failed");
            setStep("mapping");
        } finally {
            setIsImporting(false);
        }
    };

    // Reset and start over
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
