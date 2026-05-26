"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useMobileUpload } from "@/features/ocr/hooks/use-mobile-upload";
import { useOCR } from "@/features/ocr/hooks/use-ocr";
import { OCRMobileDialog, OCRResults, OCRUploadSection } from "@/features/ocr/components";
import { BackButton } from "@/components/navigation/back-button";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";

export default function OCRPage() {
  return <OCRPageContent />;
}
