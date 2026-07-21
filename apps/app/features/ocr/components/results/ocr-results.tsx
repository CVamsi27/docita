import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button, Card, CardContent, Checkbox, Label } from "@workspace/ui/components";
import { CheckCircle2 } from "lucide-react";
import { OCRHeader } from "@/features/ocr/components/sections/OCRHeader";
import { OCRPatientInfo } from "@/features/ocr/components/sections/OCRPatientInfo";
import { OCRClinicalFindings } from "@/features/ocr/components/sections/OCRClinicalFindings";
import { OCRVitals } from "@/features/ocr/components/sections/OCRVitals";
import { OCRMedications } from "@/features/ocr/components/sections/OCRMedications";
import { OCRInvoiceDraft } from "@/features/ocr/components/sections/OCRInvoiceDraft";
import { OCRLabValues } from "@/features/ocr/components/sections/OCRLabValues";
import { type Dispatch, type SetStateAction } from "react";
import { OCRFormData } from "@/features/ocr/types";
import { cn } from "@workspace/ui/lib/utils";

interface OCRResultsProps {
  scanned: boolean;
  documentType: string;
  confidenceScores: Record<string, number>;
  suggestedCorrections: Record<string, string>;
  formData: OCRFormData;
  setFormData: Dispatch<SetStateAction<OCRFormData>>;
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  isSaving: boolean;
  onSave: () => void;
  needsReviewAcknowledgement?: boolean;
  reviewAcknowledged?: boolean;
  onReviewAcknowledgedChange?: (value: boolean) => void;
}

export const OCRResults = ({
  scanned,
  documentType,
  confidenceScores,
  suggestedCorrections,
  formData,
  setFormData,
  expandedSections,
  onToggleSection,
  isSaving,
  onSave,
  needsReviewAcknowledgement = false,
  reviewAcknowledged = false,
  onReviewAcknowledgedChange,
}: OCRResultsProps) => {

  const getScore = (key: string): number | undefined => confidenceScores[key];
  const getCorrection = (key: string): string | undefined =>
    suggestedCorrections[key];
  const getSection = (key: string): boolean => expandedSections[key] ?? false;

  const hasPatientInfoLowConfidence = Object.entries(confidenceScores)
    .filter(([key]) =>
      ["firstName", "lastName", "phoneNumber", "email"].includes(key),
    )
    .some(([, score]) => score < 0.6);

  return (
    <div className="space-y-6">
      <Card
        className={cn(
          !scanned &&
            "pointer-events-none select-none border border-dashed border-muted-foreground/35 bg-muted text-muted-foreground",
        )}
      >
        <OCRHeader
          documentType={documentType}
          confidenceScores={confidenceScores}
          suggestedCorrections={suggestedCorrections}
        />
        <CardContent className="space-y-4">
          <OCRPatientInfo
            formData={formData}
            setFormData={setFormData}
            getScore={getScore}
            getCorrection={getCorrection}
            isOpen={getSection("patient")}
            onToggle={() => onToggleSection("patient")}
            hasLowConfidence={hasPatientInfoLowConfidence}
          />

          <OCRClinicalFindings
            formData={formData}
            setFormData={setFormData}
            getScore={getScore}
            isOpen={getSection("clinical")}
            onToggle={() => onToggleSection("clinical")}
          />

          <OCRVitals
            formData={formData}
            setFormData={setFormData}
            getScore={getScore}
            isOpen={getSection("vitals")}
            onToggle={() => onToggleSection("vitals")}
          />

          <OCRMedications
            formData={formData}
            isOpen={getSection("medications")}
            onToggle={() => onToggleSection("medications")}
          />

          <OCRLabValues
            formData={formData}
            setFormData={setFormData}
            getScore={getScore}
            isOpen={getSection("labValues")}
            onToggle={() => onToggleSection("labValues")}
          />

          <OCRInvoiceDraft
            formData={formData}
            setFormData={setFormData}
            isOpen={getSection("invoice")}
            onToggle={() => onToggleSection("invoice")}
          />

          {needsReviewAcknowledgement && scanned && (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 mt-4">
              <Checkbox
                id="ocr-review-ack"
                checked={reviewAcknowledged}
                onCheckedChange={(v) =>
                  onReviewAcknowledgedChange?.(v === true)
                }
                className="mt-0.5"
              />
              <Label
                htmlFor="ocr-review-ack"
                className="text-sm font-normal leading-snug cursor-pointer"
              >
                I have reviewed fields flagged with low confidence and corrected
                any errors before creating this patient record.
              </Label>
            </div>
          )}

          <Button
            className="w-full mt-4"
            onClick={onSave}
            disabled={
              isSaving ||
              (needsReviewAcknowledgement && scanned && !reviewAcknowledged)
            }
          >
            {isSaving ? (
              <>
                <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
                Saving record…
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Create Patient & Visit
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
