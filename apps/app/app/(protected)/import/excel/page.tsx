"use client";

import { FeatureGate } from "@/components/auth/feature-gate";
import { Feature } from "@/lib/stores/permission-store";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowRight } from "lucide-react";
import { useExcelImport } from "@/features/excel/hooks/use-excel-import";
import { ExcelUploadStep } from "@/features/excel/components/ExcelUploadStep";
import { ExcelMappingStep } from "@/features/excel/components/ExcelMappingStep";
import { ExcelImportingStep } from "@/features/excel/components/ExcelImportingStep";
import { ExcelResultsStep } from "@/features/excel/components/ExcelResultsStep";
import { Button } from "@workspace/ui/components/form/button";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";

export default function ExcelImportPage() {
  return <ExcelImportPageContent />;
}
