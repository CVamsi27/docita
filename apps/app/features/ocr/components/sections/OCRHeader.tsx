import { AlertCircle, AlertOctagon, Lightbulb } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

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
            <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
              {documentType}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      {/* Basic OCR Notice */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3 flex gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          <p className="font-medium mb-1">Manual Data Entry Required</p>
          <p className="text-xs mb-2">
            This basic OCR mode accepts the image file. For automatic text
            extraction and field population, enable the AI-powered extraction
            feature.
          </p>
        </div>
      </div>

      {/* Low Confidence Warning */}
      {Object.entries(confidenceScores).some(([, score]) => score < 0.6) && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 flex gap-3">
          <AlertOctagon className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <div className="text-sm text-red-800 dark:text-red-300">
            <p className="font-medium">Low confidence fields detected</p>
            <p className="text-xs">
              Please review and correct highlighted fields
            </p>
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {Object.keys(suggestedCorrections).length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 flex gap-3">
          <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
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
