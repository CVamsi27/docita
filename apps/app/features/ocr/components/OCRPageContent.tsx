"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useMobileUpload } from "@/features/ocr/hooks/use-mobile-upload";
import { useOCR } from "@/features/ocr/hooks/use-ocr";
import { OCRMobileDialog, OCRResults, OCRUploadSection } from "@/features/ocr/components";
import { BackButton } from "@/components/navigation/back-button";
import { AppPageScaffold, PageHeader } from "@workspace/ui/components";

export function OCRPageContent() {
  const {
    file,
    previewUrl,
    scanned,
    formData,
    setFormData,
    confidenceScores,
    suggestedCorrections,
    documentType,
    handleFileChange,
    handleScan,
    handleSave,
    isScanning,
    isSaving,
    expandedSections,
    toggleSection,
    needsReviewAcknowledgement,
    reviewAcknowledged,
    setReviewAcknowledged,
  } = useOCR();
  const { showQr, setShowQr, qrUrl, startMobileUpload } = useMobileUpload();
  const handleMobileUploadStart = () => {
    startMobileUpload((file, _url) => {
      handleFileChange(file);
    });
  };
  return (
    <FeatureGate feature={Feature.OCR_BASIC} showLockedCard>
      <AppPageScaffold
        className="max-w-5xl"
        header={
          <PageHeader
            breadcrumbs={
              <BackButton fallback="/import" label="Back to Import" />
            }
            title="Smart OCR Digitization"
            description="Upload a photo of a prescription or case sheet to auto-extract details."
          />
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <OCRUploadSection
            previewUrl={previewUrl}
            file={file}
            isScanning={isScanning}
            scanned={scanned}
            onFileChange={handleFileChange}
            onStartMobileUpload={handleMobileUploadStart}
            onScan={handleScan}
          />
          <OCRResults
            scanned={scanned}
            documentType={documentType}
            confidenceScores={confidenceScores}
            suggestedCorrections={suggestedCorrections}
            formData={formData}
            setFormData={setFormData}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            isSaving={isSaving}
            onSave={handleSave}
            needsReviewAcknowledgement={needsReviewAcknowledgement}
            reviewAcknowledged={reviewAcknowledged}
            onReviewAcknowledgedChange={setReviewAcknowledged}
          />
        </div>
        <OCRMobileDialog open={showQr} onOpenChange={setShowQr} qrUrl={qrUrl} />
      </AppPageScaffold>
    </FeatureGate>
  );
}
