"use client";

import { useState } from "react";
import { apiHooks } from "@/lib/api-hooks";
import {
  BulkImportDialogUI,
  EntityType,
  BulkImportStep,
} from "./BulkImportDialogUI";
interface BulkImportDialogContainerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export function BulkImportDialogContainer({
  open,
  onOpenChange,
}: BulkImportDialogContainerProps) {
  const [isOpen, setIsOpen] = useState(open ?? false);
  const [step, setStep] = useState<BulkImportStep>("select");
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
    try {
      const buffer = await file.arrayBuffer();
      await importMutation.mutateAsync({
        entityType: selectedEntity,
        fileName: file.name,
        fileBuffer: Buffer.from(buffer),
      });
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
    <BulkImportDialogUI
      isOpen={isOpen}
      step={step}
      selectedEntity={selectedEntity}
      progress={progress}
      isLoadingTemplate={templateQuery.isLoading}
      isImporting={importMutation.isPending}
      onOpen={openModal}
      onClose={closeModal}
      onSelectEntity={setSelectedEntity}
      onContinue={() => setStep("download")}
      onDownloadTemplate={handleDownloadTemplate}
      onFileUpload={handleFileUpload}
      onImportAnother={() => setStep("select")}
    />
  );
}

export default BulkImportDialogContainer;
export { BulkImportDialogContainer as BulkImportDialog };
