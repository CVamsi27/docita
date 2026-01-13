"use client";

import { useMobileUpload } from "@/features/ocr/hooks/use-mobile-upload";
import { useOCR } from "@/features/ocr/hooks/use-ocr";
import { OCRMobileDialog } from "@/features/ocr/components/OCRMobileDialog";
import { OCRResults } from "@/features/ocr/components/OCRResults";
import { OCRUploadSection } from "@/features/ocr/components/OCRUploadSection";
import { Button } from "@workspace/ui/components/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function OCRPage() {
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
  } = useOCR();

  const { showQr, setShowQr, qrUrl, startMobileUpload } = useMobileUpload();

  const handleMobileUploadStart = () => {
    startMobileUpload((file, _url) => {
      // We can pass the file directly to the OCR hook's handleFileChange
      handleFileChange(file);
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/import">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Import
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Smart OCR Digitization
        </h1>
        <p className="text-muted-foreground">
          Upload a photo of a prescription or case sheet to auto-extract
          details.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Upload & Preview */}
        <OCRUploadSection
          previewUrl={previewUrl}
          file={file}
          isScanning={isScanning}
          scanned={scanned}
          onFileChange={handleFileChange}
          onStartMobileUpload={handleMobileUploadStart}
          onScan={handleScan}
        />

        {/* Right Column: Correction Panel */}
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
        />
      </div>

      {/* QR Code Dialog */}
      <OCRMobileDialog open={showQr} onOpenChange={setShowQr} qrUrl={qrUrl} />
    </div>
  );
}
