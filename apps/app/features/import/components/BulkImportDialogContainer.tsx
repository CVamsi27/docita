"use client";

import { useEffect, useState, useRef } from "react";
import { DPDP_NOTICE_VERSION } from "@workspace/types";
import {
  useBulkImport,
  useBulkImportJobStatus,
  useBulkImportTemplate,
} from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  BulkImportDialogUI,
  BulkImportStep,
  EntityType,
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
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (open !== undefined && open !== prevOpenRef.current) {
      prevOpenRef.current = open;
      setIsOpen(open);
    }
  }, [open]);
  const [step, setStep] = useState<BulkImportStep>("select");
  const [selectedEntity, setSelectedEntity] = useState<EntityType>("PATIENT");
  const [progress, setProgress] = useState(0);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobSummary, setJobSummary] = useState<{
    successRows: number;
    failedRows: number;
    totalRows: number;
    status: string;
  } | null>(null);
  const [dpdpAttestationConfirmed, setDpdpAttestationConfirmed] =
    useState(false);

  const templateQuery = useBulkImportTemplate(selectedEntity);
  const importMutation = useBulkImport();
  const jobStatusQuery = useBulkImportJobStatus(
    step === "progress" ? activeJobId : null,
  );

  useEffect(() => {
    if (step !== "progress" || !activeJobId || !jobStatusQuery.data) {
      return;
    }
    const j = jobStatusQuery.data;
    const pct =
      j.totalRows > 0
        ? Math.round((j.processedRows / j.totalRows) * 100)
        : 0;
    setProgress(Math.min(100, pct));

    if (
      j.status === "COMPLETED" ||
      j.status === "FAILED" ||
      j.status === "PARTIALLY_COMPLETED"
    ) {
      setProgress(100);
      setJobSummary({
        successRows: j.successRows,
        failedRows: j.failedRows,
        totalRows: j.totalRows,
        status: j.status,
      });
      setStep("result");
    }
  }, [step, activeJobId, jobStatusQuery.data]);

  const openModal = () => {
    setIsOpen(true);
    onOpenChange?.(true);
  };
  const closeModal = () => {
    setIsOpen(false);
    setStep("select");
    setProgress(0);
    setActiveJobId(null);
    setJobSummary(null);
    setDpdpAttestationConfirmed(false);
    onOpenChange?.(false);
  };

  useEffect(() => {
    setDpdpAttestationConfirmed(false);
  }, [selectedEntity]);
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
    if (selectedEntity === "PATIENT" && !dpdpAttestationConfirmed) {
      showUserFacingErrorToast(
        null,
        "Confirm DPDP consent attestation before uploading.",
        "upload",
      );
      e.target.value = "";
      return;
    }
    setStep("progress");
    setProgress(0);
    setJobSummary(null);
    setActiveJobId(null);
    try {
      const buffer = await file.arrayBuffer();
      const fileBase64 = Buffer.from(buffer).toString("base64");
      const result = await importMutation.mutateAsync({
        entityType: selectedEntity,
        fileName: file.name,
        fileBase64,
        dpdpAttestation:
          selectedEntity === "PATIENT"
            ? {
                confirmedByOperator: true,
                noticeVersion: DPDP_NOTICE_VERSION,
              }
            : undefined,
      });
      setActiveJobId(result.jobId);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not prepare this import. Please try again.",
        "upload",
      );
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
      isImporting={importMutation.isPending || step === "progress"}
      hideTrigger={open !== undefined}
      jobSummary={jobSummary}
      dpdpAttestationConfirmed={dpdpAttestationConfirmed}
      onDpdpAttestationChange={setDpdpAttestationConfirmed}
      onOpen={openModal}
      onClose={closeModal}
      onSelectEntity={setSelectedEntity}
      onContinue={() => setStep("download")}
      onDownloadTemplate={handleDownloadTemplate}
      onFileUpload={handleFileUpload}
      onImportAnother={() => {
        setStep("select");
        setProgress(0);
        setActiveJobId(null);
        setJobSummary(null);
        setDpdpAttestationConfirmed(false);
      }}
    />
  );
}

export { BulkImportDialogContainer as BulkImportDialog };
