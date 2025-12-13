import React, { useState } from "react";
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
import { apiHooks } from "@/lib/api-hooks";

type EntityType =
  | "PATIENT"
  | "PRESCRIPTION"
  | "DOCTOR"
  | "LAB_TEST"
  | "INVENTORY";

interface BulkImportDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BulkImportDialog({
  open,
  onOpenChange,
}: BulkImportDialogProps) {
  const [isOpen, setIsOpen] = useState(open ?? false);
  const [step, setStep] = useState<
    "select" | "download" | "upload" | "progress" | "result"
  >("select");
  const [selectedEntity, setSelectedEntity] = useState<EntityType>("PATIENT");
  const [progress, setProgress] = useState(0);

  const templateQuery = apiHooks.useBulkImportTemplate(selectedEntity);
  const importMutation = apiHooks.useBulkImport();

  const openModal = () => {
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setStep("select");
    setProgress(0);
    onOpenChange?.(false);
  };

  const handleDownloadTemplate = () => {
    if (!templateQuery.data) return;

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," +
        encodeURIComponent(templateQuery.data.template),
    );
    element.setAttribute(
      "download",
      `${selectedEntity.toLowerCase()}_import_template.csv`,
    );
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setStep("upload");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep("progress");
    setProgress(0);

    try {
      const buffer = await file.arrayBuffer();
      await importMutation.mutateAsync({
        entityType: selectedEntity,
        fileName: file.name,
        fileBuffer: Buffer.from(buffer),
      });

      // Simulate progress
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 30;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          setProgress(100);
        } else {
          setProgress(Math.min(currentProgress, 99));
        }
      }, 500);

      setTimeout(() => {
        setProgress(100);
        setStep("result");
      }, 3000);
    } catch (error) {
      console.error("Import failed:", error);
      alert(error instanceof Error ? error.message : "Import failed");
      setStep("upload");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={openModal} className="gap-2">
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
            {(
              ["select", "download", "upload", "progress", "result"] as const
            ).map((s, idx, arr) => (
              <React.Fragment key={s}>
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    arr.indexOf(s) <= arr.indexOf(step)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {idx + 1}
                </div>
                {idx < arr.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-1 mx-2 rounded-full transition-colors",
                      arr.indexOf(s) < arr.indexOf(step)
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
                {(
                  [
                    "PATIENT",
                    "PRESCRIPTION",
                    "DOCTOR",
                    "LAB_TEST",
                    "INVENTORY",
                  ] as const
                ).map((entity) => (
                  <button
                    key={entity}
                    onClick={() => setSelectedEntity(entity)}
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
              <Button onClick={() => setStep("download")} className="w-full">
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
                onClick={handleDownloadTemplate}
                disabled={templateQuery.isLoading}
                className="w-full h-24 border-dashed border-2 text-lg gap-3"
              >
                {templateQuery.isLoading ? (
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
                  onChange={handleFileUpload}
                  disabled={importMutation.isPending}
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
                  onClick={() => setStep("select")}
                  className="w-full"
                >
                  Import Another File
                </Button>
                <Button onClick={closeModal} className="w-full">
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

export default BulkImportDialog;
