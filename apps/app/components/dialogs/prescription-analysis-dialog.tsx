import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Loader2,
  X,
} from "lucide-react";
import { apiHooks } from "@/lib/api-hooks";

interface PrescriptionAnalysisDialogProps {
  medications: Array<{ name: string; dosage: string }>;
  patientAge?: number;
  patientAllergies?: string[];
  existingConditions?: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PrescriptionAnalysisDialog({
  medications,
  patientAge,
  patientAllergies,
  existingConditions,
  open,
  onOpenChange,
}: PrescriptionAnalysisDialogProps) {
  const [isOpen, setIsOpen] = useState(open ?? false);

  const analysisQuery = apiHooks.useAIPrescriptionAnalysis();

  const handleAnalyze = async () => {
    try {
      await analysisQuery.mutateAsync({
        medications,
        patientAge,
        patientAllergies,
        existingConditions,
      });
    } catch (error) {
      console.error("AI analysis failed:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to analyze prescription",
      );
    }
  };

  const data = analysisQuery.data;
  const isLoading = analysisQuery.isPending;

  const openModal = () => {
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        <Lightbulb className="h-4 w-4" />
        AI Analysis
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  AI Prescription Analysis
                </h2>
                <p className="text-sm text-gray-600">
                  Analyze prescription for drug interactions and dosage
                  appropriateness
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!data && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      This AI analysis uses OpenAI GPT-4 to check for drug
                      interactions, contraindications, and dosage
                      appropriateness based on patient profile.
                    </p>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isLoading ? "Analyzing..." : "Analyze Prescription"}
                  </button>
                </>
              )}

              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                  <p className="text-sm text-gray-600">
                    Analyzing prescription with AI...
                  </p>
                </div>
              )}

              {data && (
                <div className="space-y-6">
                  {/* Drug Interactions */}
                  {data.drugInteractions &&
                    data.drugInteractions.length > 0 && (
                      <div className="border rounded-lg">
                        <div className="bg-gray-50 border-b px-4 py-3 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                          <div>
                            <h3 className="font-semibold">Drug Interactions</h3>
                            <p className="text-xs text-gray-600">
                              {data.drugInteractions.length} potential
                              interaction(s) found
                            </p>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          {data.drugInteractions.map((interaction, idx) => (
                            <div
                              key={idx}
                              className="border rounded-lg p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">
                                  {interaction.drug1} ↔ {interaction.drug2}
                                </p>
                                <span
                                  className={`text-xs font-semibold px-2 py-1 rounded ${
                                    interaction.severity === "severe"
                                      ? "bg-red-100 text-red-800"
                                      : interaction.severity === "moderate"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {interaction.severity}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {interaction.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Contraindications */}
                  {data.contraindications &&
                    data.contraindications.length > 0 && (
                      <div className="border border-red-200 rounded-lg bg-red-50">
                        <div className="border-b border-red-200 px-4 py-3 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <div>
                            <h3 className="font-semibold text-red-900">
                              Contraindications
                            </h3>
                            <p className="text-xs text-red-700">
                              {data.contraindications.length}{" "}
                              contraindication(s) detected
                            </p>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          {data.contraindications.map((contra, idx) => (
                            <div
                              key={idx}
                              className="border border-red-200 bg-white rounded-lg p-3 space-y-2"
                            >
                              <p className="font-medium text-red-900 text-sm">
                                {contra.medication} ← {contra.condition}
                              </p>
                              <p className="text-sm text-red-800">
                                {contra.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Dosage Recommendations */}
                  {data.dosageRecommendations &&
                    data.dosageRecommendations.length > 0 && (
                      <div className="border rounded-lg">
                        <div className="bg-gray-50 border-b px-4 py-3 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <h3 className="font-semibold">Dosage Assessment</h3>
                        </div>
                        <div className="p-4 space-y-3">
                          {data.dosageRecommendations.map((rec, idx) => (
                            <div
                              key={idx}
                              className="border rounded-lg p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">
                                  {rec.medication}
                                </p>
                                <span
                                  className={`text-xs font-semibold px-2 py-1 rounded ${
                                    rec.status === "appropriate"
                                      ? "bg-green-100 text-green-800"
                                      : rec.status === "high"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {rec.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {rec.recommendation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  <button
                    onClick={closeModal}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PrescriptionAnalysisDialog;
