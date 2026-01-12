import React from "react";
import { CheckCircle2, Download, Loader2, Upload } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";

export type EntityType =
  | "PATIENT"
  | "PRESCRIPTION"
  | "DOCTOR"
  | "LAB_TEST"
  | "INVENTORY";
export type BulkImportStep =
  | "select"
  | "download"
  | "upload"
  | "progress"
  | "result";

export interface BulkImportDialogUIProps {
  isOpen: boolean;
  step: BulkImportStep;
  selectedEntity: EntityType;
  progress: number;
  isLoadingTemplate: boolean;
  isImporting: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelectEntity: (entity: EntityType) => void;
  onContinue: () => void;
  onDownloadTemplate: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportAnother: () => void;
}

const ENTITIES: EntityType[] = [
  "PATIENT",
  "PRESCRIPTION",
  "DOCTOR",
  "LAB_TEST",
  "INVENTORY",
];
const STEPS: BulkImportStep[] = [
  "select",
  "download",
  "upload",
  "progress",
  "result",
];

export function BulkImportDialogUI({
  isOpen,
  step,
  selectedEntity,
  progress,
  isLoadingTemplate,
  isImporting,
  onOpen,
  onClose,
  onSelectEntity,
  onContinue,
  onDownloadTemplate,
  onFileUpload,
  onImportAnother,
}: BulkImportDialogUIProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogTrigger asChild>
        <Button onClick={onOpen} className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Data</DialogTitle>
          <DialogDescription>
            Import data into Docita using CSV files. Follow the steps below.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Step Indicator */}
          <div className="mb-8 flex items-center justify-between px-2">
            {STEPS.map((s, idx) => (
              <React.Fragment key={s}>
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    STEPS.indexOf(s) <= STEPS.indexOf(step)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {idx + 1}
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-1 mx-2 rounded-full transition-colors",
                      STEPS.indexOf(s) < STEPS.indexOf(step)
                        ? "bg-primary"
                        : "bg-muted",
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Select Entity */}
          {step === "select" && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                Select the type of data you want to import:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {ENTITIES.map((entity) => (
                  <button
                    key={entity}
                    onClick={() => onSelectEntity(entity)}
                    className={cn(
                      "flex items-center justify-center p-4 rounded-lg border-2 text-sm font-medium transition-all hover:border-primary/50",
                      selectedEntity === entity
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted bg-background hover:bg-muted/50",
                    )}
                  >
                    {entity === "LAB_TEST" ? "Lab Tests" : entity}
                  </button>
                ))}
              </div>
              <Button onClick={onContinue} className="w-full">
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Download Template */}
          {step === "download" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                  <Download className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Download Template</h3>
                <p className="text-sm text-muted-foreground">
                  Get the CSV template for {selectedEntity.toLowerCase()}{" "}
                  import.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={onDownloadTemplate}
                disabled={isLoadingTemplate}
                className="w-full h-24 border-dashed border-2 text-lg gap-3"
              >
                {isLoadingTemplate ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading template...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Download CSV Template
                  </>
                )}
              </Button>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-200 dark:border-blue-900">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <span className="font-semibold">Note:</span> Fill the CSV
                  template with your data. Make sure not to change the header
                  columns.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Upload File */}
          {step === "upload" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                  <Upload className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Upload Data</h3>
                <p className="text-sm text-muted-foreground">
                  Upload your filled CSV file here.
                </p>
              </div>
              <label className="flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV files up to 50MB
                  </p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={onFileUpload}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Step 4: Progress */}
          {step === "progress" && (
            <div className="space-y-8 py-8">
              <div className="text-center space-y-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <h3 className="font-semibold">Importing Data...</h3>
                <p className="text-sm text-muted-foreground">
                  Please wait while we process your file.
                </p>
              </div>
              <div className="space-y-2 px-4">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Processing...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Result */}
          {step === "result" && (
            <div className="space-y-6 py-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                    Import Successful!
                  </h3>
                  <p className="text-muted-foreground mt-1 max-w-xs mx-auto">
                    Your data has been queued for processing. You&apos;ll be
                    notified once it&apos;s complete.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={onImportAnother}
                  className="w-full"
                >
                  Import Another File
                </Button>
                <Button onClick={onClose} className="w-full">
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
