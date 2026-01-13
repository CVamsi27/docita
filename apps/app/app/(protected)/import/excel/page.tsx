"use client";

import { FeatureGate } from "@/features/_shared/components/feature-gate";
import { Feature } from "@/lib/stores/permission-store";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowRight } from "lucide-react";
import { useExcelImport } from "@/features/excel/hooks/use-excel-import";
import { ExcelUploadStep } from "@/features/excel/components/ExcelUploadStep";
import { ExcelMappingStep } from "@/features/excel/components/ExcelMappingStep";
import { ExcelImportingStep } from "@/features/excel/components/ExcelImportingStep";
import { ExcelResultsStep } from "@/features/excel/components/ExcelResultsStep";
import { Button } from "@workspace/ui/components/button";

export default function ExcelImportPage() {
  const {
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
  } = useExcelImport();

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
                    : ["upload", "mapping", "importing", "results"].indexOf(step) >
                      i
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
          <ExcelUploadStep
            file={file}
            isUploading={isUploading}
            DB_FIELDS={DB_FIELDS}
            onFileChange={handleFileChange}
            onUpload={handleUpload}
          />
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && preview && (
          <ExcelMappingStep
            preview={preview}
            columnMappings={columnMappings}
            DB_FIELDS={DB_FIELDS}
            isImporting={isImporting}
            onUpdateMapping={updateMapping}
            onImport={handleImport}
            hasRequiredMappings={hasRequiredMappings}
          />
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <ExcelImportingStep
            progress={importProgress}
            totalRows={preview?.totalRows || 0}
          />
        )}

        {/* Step 4: Results */}
        {step === "results" && importResult && (
          <ExcelResultsStep result={importResult} onReset={handleReset} />
        )}
      </div>
    </FeatureGate>
  );
}
