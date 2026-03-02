import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { OCRHeader } from "@/features/ocr/components/sections/OCRHeader";
import { OCRPatientInfo } from "@/features/ocr/components/sections/OCRPatientInfo";
import { OCRClinicalFindings } from "@/features/ocr/components/sections/OCRClinicalFindings";
import { OCRVitals } from "@/features/ocr/components/sections/OCRVitals";
import { OCRMedications } from "@/features/ocr/components/sections/OCRMedications";
import { OCRLabValues } from "@/features/ocr/components/sections/OCRLabValues";
import { type Dispatch, type SetStateAction } from "react";
import { OCRFormData } from "@/features/ocr/types";

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
      <Card className={!scanned ? "opacity-50 pointer-events-none" : ""}>
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

          <Button className="w-full mt-4" onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                Record...
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
