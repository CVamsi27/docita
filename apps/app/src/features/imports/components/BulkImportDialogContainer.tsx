import { BulkImportDialogUI } from "./BulkImportDialogUI";
import { useBulkImportDialog } from "./use-bulk-import-dialog";

interface BulkImportDialogContainerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function BulkImportDialogContainer({
  open,
  onOpenChange,
}: BulkImportDialogContainerProps) {
  const h = useBulkImportDialog({ open, onOpenChange });

  return (
    <BulkImportDialogUI
      isOpen={h.isOpen}
      step={h.step}
      selectedEntity={h.selectedEntity}
      progress={h.progress}
      isLoadingTemplate={h.templateQuery.isLoading}
      isImporting={h.importMutation.isPending || h.step === "progress"}
      hideTrigger={open !== undefined}
      jobSummary={h.jobSummary}
      dpdpAttestationConfirmed={h.dpdpAttestationConfirmed}
      onDpdpAttestationChange={h.setDpdpAttestationConfirmed}
      onOpen={h.openModal}
      onClose={h.closeModal}
      onSelectEntity={h.setSelectedEntity}
      onContinue={h.handleContinue}
      onDownloadTemplate={h.handleDownloadTemplate}
      onFileUpload={h.handleFileUpload}
      onImportAnother={h.handleImportAnother}
    />
  );
}

export { BulkImportDialogContainer as BulkImportDialog };
