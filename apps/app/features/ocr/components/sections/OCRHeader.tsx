import { AlertCircle, AlertOctagon, Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";
import { CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";

interface OCRHeaderProps {
  documentType: string;
  confidenceScores: Record<string, number>;
  suggestedCorrections: Record<string, string>;
}

/**
 * Phase 3 (per-feature): apps/app OCR > header.
 * 5 literals converted to useTranslations("Ocr.header").
 */
function useOCRHeaderTranslations() {
  return useTranslations("Ocr.header");
}

export const OCRHeader = ({
  documentType,
  confidenceScores,
  suggestedCorrections,
}: OCRHeaderProps) => {
  const t = useOCRHeaderTranslations();
  return (
    <>
      <CardHeader>
        <CardTitle>{t("staffPanelTitle")}</CardTitle>
        <CardDescription>
          {t("staffPanelSubtitle")}
          {documentType && documentType !== "GENERAL" && (
            <span className="ml-2 text-xs badge-info border px-2 py-1 rounded">
              {documentType}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <div className="surface-warning rounded-lg p-3 flex gap-3">
        <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="text-sm text-warning-foreground">
          <p className="font-medium mb-1">{t("manualEntryTitle")}</p>
          <p className="text-xs mb-2">{t("manualEntryBody")}</p>
        </div>
      </div>

      {Object.entries(confidenceScores).some(([, score]) => score < 0.6) && (
        <div className="surface-danger rounded-lg p-3 flex gap-3">
          <AlertOctagon className="h-5 w-5 text-destructive shrink-0" />
          <div className="text-sm text-destructive">
            <p className="font-medium">{t("lowConfidenceTitle")}</p>
            <p className="text-xs">{t("lowConfidenceBody")}</p>
          </div>
        </div>
      )}

      {Object.keys(suggestedCorrections).length > 0 && (
        <div className="surface-info rounded-lg p-3 flex gap-3">
          <Lightbulb className="h-5 w-5 text-info shrink-0" />
          <div className="text-sm text-info">
            <p className="font-medium">{t("aiSuggestionsTitle")}</p>
            <p className="text-xs">{t("aiSuggestionsBody")}</p>
          </div>
        </div>
      )}
    </>
  );
};
