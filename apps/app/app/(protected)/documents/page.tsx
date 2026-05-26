"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useDocumentsLogic } from "@/features/documents/hooks/use-documents-logic";
import { DocumentsPageUI } from "@/features/documents/components/DocumentsPageUI";

export default function DocumentsPage() {
  return <DocumentsPageContainer />;
}
