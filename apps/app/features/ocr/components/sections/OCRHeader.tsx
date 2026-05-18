import { AlertCircle, AlertOctagon, Lightbulb } from "lucide-react";
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";

interface OCRHeaderProps {
  documentType: string;
  confidenceScores: Record<string, number>;
  suggestedCorrections: Record<string, string>;
}

export const OCRHeader = ({
  documentType,
  confidenceScores,
  suggestedCorrections,
}: OCRHeaderProps) => {
  return (
    <>
      <CardHeader>
        <CardTitle>2. Staff Correction Panel</CardTitle>
        <CardDescription>
          Verify and correct the extracted information
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
          <p className="font-medium mb-1">Manual Data Entry Required</p>
          <p className="text-xs mb-2">
            This basic OCR mode accepts the image file. For automatic text
            extraction and field population, enable the AI-powered extraction
            feature.
          </p>
        </div>
      </div>

      {Object.entries(confidenceScores).some(([, score]) => score < 0.6) && (
        <div className="surface-danger rounded-lg p-3 flex gap-3">
          <AlertOctagon className="h-5 w-5 text-destructive shrink-0" />
          <div className="text-sm text-destructive">
            <p className="font-medium">Low confidence fields detected</p>
            <p className="text-xs">
              Please review and correct highlighted fields
            </p>
          </div>
        </div>
      )}

      {Object.keys(suggestedCorrections).length > 0 && (
        <div className="surface-info rounded-lg p-3 flex gap-3">
          <Lightbulb className="h-5 w-5 text-info shrink-0" />
          <div className="text-sm text-info">
            <p className="font-medium">AI Suggestions Available</p>
            <p className="text-xs">
              Review suggested corrections above each field
            </p>
          </div>
        </div>
      )}
    </>
  );
};
