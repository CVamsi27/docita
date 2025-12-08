"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Progress } from "@workspace/ui/components/progress";
import { Badge } from "@workspace/ui/components/badge";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  Check,
  AlertTriangle,
  Loader2,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { FeatureGate } from "@/components/common/feature-gate";
import { Feature } from "@/lib/stores/permission-store";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@workspace/ui/lib/utils";
import { useAppConfig } from "@/lib/app-config-context";

interface ColumnMapping {
  excelColumn: string;
  dbField: string | null;
  sampleValues: string[];
}

interface ImportPreview {
  sessionId: string;
  columns: ColumnMapping[];
  suggestedMappings: Record<string, string>;
  totalRows: number;
  sampleData: Record<string, string | number | null>[];
}

interface ImportResult {
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

type Step = "upload" | "mapping" | "importing" | "results";

export default function ExcelImportPage() {
  const router = useRouter();
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

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

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

  return (
    <FeatureGate feature={Feature.EXCEL_IMPORT}>
      <div className="flex-1 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Excel Import</h1>
            <p className="text-muted-foreground">
              Import patient data from Excel or CSV files with smart column
              mapping.
            </p>
          </div>
          {step !== "upload" && (
            <Button variant="outline" onClick={handleReset}>
              Start Over
            </Button>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {["upload", "mapping", "importing", "results"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : ["upload", "mapping", "importing", "results"].indexOf(
                          step,
                        ) > i
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  "ml-2 text-sm font-medium capitalize",
                  step === s ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s}
              </span>
              {i < 3 && (
                <ArrowRight className="mx-4 h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Upload Excel File
              </CardTitle>
              <CardDescription>
                Select an Excel (.xlsx, .xls) or CSV file containing patient
                data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors",
                  file
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50",
                )}
              >
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Label
                  htmlFor="file-upload"
                  className="flex cursor-pointer flex-col items-center"
                >
                  {file ? (
                    <>
                      <FileSpreadsheet className="h-12 w-12 text-primary" />
                      <span className="mt-2 font-medium">{file.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground" />
                      <span className="mt-2 font-medium">
                        Click to upload or drag and drop
                      </span>
                      <span className="text-sm text-muted-foreground">
                        XLSX, XLS, or CSV (max 10MB)
                      </span>
                    </>
                  )}
                </Label>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium mb-2">Expected Columns</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Your file should contain columns for patient information.
                  We&apos;ll automatically detect and map common column names.
                </p>
                <div className="flex flex-wrap gap-2">
                  {DB_FIELDS.map((field) => (
                    <Badge
                      key={field.field}
                      variant={field.required ? "default" : "secondary"}
                    >
                      {field.label}
                      {field.required && " *"}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing File...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload & Preview
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && preview && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Mapping Section */}
            <Card>
              <CardHeader>
                <CardTitle>Column Mapping</CardTitle>
                <CardDescription>
                  Map your Excel columns to database fields. Required fields are
                  marked with *.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {preview.columns.map((col) => (
                  <div
                    key={col.excelColumn}
                    className="flex items-center gap-4"
                  >
                    <div className="flex-1">
                      <Label className="text-sm font-medium">
                        {col.excelColumn}
                      </Label>
                      <p className="text-xs text-muted-foreground truncate">
                        e.g., {col.sampleValues.slice(0, 2).join(", ")}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Select
                      value={columnMappings[col.excelColumn] || ""}
                      onValueChange={(value) =>
                        updateMapping(col.excelColumn, value || null)
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Skip this column</SelectItem>
                        {DB_FIELDS.map((field) => (
                          <SelectItem key={field.field} value={field.field}>
                            {field.label}
                            {field.required && " *"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex-col gap-4">
                {!hasRequiredMappings() && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm w-full">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      Please map both First Name and Phone Number (required)
                    </span>
                  </div>
                )}
                <Button
                  onClick={handleImport}
                  disabled={!hasRequiredMappings() || isImporting}
                  className="w-full"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Import {preview.totalRows} Patients
                </Button>
              </CardFooter>
            </Card>

            {/* Preview Section */}
            <Card>
              <CardHeader>
                <CardTitle>Data Preview</CardTitle>
                <CardDescription>
                  Showing first {preview.sampleData.length} rows of{" "}
                  {preview.totalRows} total.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {preview.columns
                          .filter((c) => columnMappings[c.excelColumn])
                          .map((col) => (
                            <TableHead key={col.excelColumn}>
                              {columnMappings[col.excelColumn]}
                            </TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.sampleData.map((row, i) => (
                        <TableRow key={i}>
                          {preview.columns
                            .filter((c) => columnMappings[c.excelColumn])
                            .map((col) => (
                              <TableCell key={col.excelColumn}>
                                {row[col.excelColumn] || "-"}
                              </TableCell>
                            ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Importing Patients
              </CardTitle>
              <CardDescription>
                Please wait while we import your data...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={importProgress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                Processing {preview?.totalRows || 0} records...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Results */}
        {step === "results" && importResult && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{importResult.total}</p>
                      <p className="text-sm text-muted-foreground">
                        Total Rows
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-300" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {importResult.success}
                      </p>
                      <p className="text-sm text-muted-foreground">Imported</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900">
                      <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-300" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">
                        {importResult.duplicates}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Duplicates
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-red-100 p-3 dark:bg-red-900">
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-300" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {importResult.failed}
                      </p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Errors & Duplicates */}
            {(importResult.errors.length > 0 ||
              importResult.duplicateDetails.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>Import Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {importResult.duplicateDetails.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Duplicates Skipped
                      </h4>
                      <div className="rounded-md border max-h-48 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Row</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead>Existing Patient</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importResult.duplicateDetails.map((dup, i) => (
                              <TableRow key={i}>
                                <TableCell>{dup.row}</TableCell>
                                <TableCell>{dup.reason}</TableCell>
                                <TableCell>
                                  {dup.existingPatient
                                    ? `${dup.existingPatient.name} (${dup.existingPatient.phone})`
                                    : "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {importResult.errors.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Errors
                      </h4>
                      <div className="rounded-md border p-4 max-h-48 overflow-auto bg-muted/50">
                        {importResult.errors.map((error, i) => (
                          <p key={i} className="text-sm text-red-600">
                            {error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button onClick={() => router.push("/patients")}>
                <Check className="mr-2 h-4 w-4" />
                View Patients
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Import More
              </Button>
            </div>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}
