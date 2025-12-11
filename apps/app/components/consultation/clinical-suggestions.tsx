"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Lightbulb, X, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface Suggestion {
  type: "diagnosis" | "investigation" | "treatment";
  text: string;
  confidence: "high" | "medium" | "low";
  reason?: string;
}

interface ClinicalSuggestionsProps {
  chiefComplaint: string;
  onApplySuggestion?: (suggestion: Suggestion) => void;
  className?: string;
}

// Smart suggestion engine based on chief complaint
const generateSuggestions = (chiefComplaint: string): Suggestion[] => {
  const complaint = chiefComplaint.toLowerCase();
  const suggestions: Suggestion[] = [];

  // Fever patterns
  if (complaint.includes("fever")) {
    suggestions.push({
      type: "investigation",
      text: "Complete Blood Count (CBC)",
      confidence: "high",
      reason: "To check for infection markers",
    });

    if (complaint.includes("cough") || complaint.includes("cold")) {
      suggestions.push({
        type: "diagnosis",
        text: "Upper Respiratory Tract Infection (J06.9)",
        confidence: "high",
        reason: "Common presentation with fever and cough",
      });
    }
  }

  // Headache patterns
  if (complaint.includes("headache")) {
    suggestions.push({
      type: "investigation",
      text: "Blood Pressure Check",
      confidence: "high",
      reason: "Rule out hypertension",
    });

    if (complaint.includes("severe") || complaint.includes("sudden")) {
      suggestions.push({
        type: "investigation",
        text: "CT Scan Brain",
        confidence: "medium",
        reason: "Rule out serious pathology with sudden severe headache",
      });
    }
  }

  // Chest pain patterns
  if (
    complaint.includes("chest pain") ||
    complaint.includes("chest discomfort")
  ) {
    suggestions.push({
      type: "investigation",
      text: "ECG (12-lead)",
      confidence: "high",
      reason: "Rule out cardiac causes",
    });
    suggestions.push({
      type: "investigation",
      text: "Troponin levels",
      confidence: "high",
      reason: "Cardiac marker for MI",
    });
  }

  // Abdominal pain patterns
  if (
    complaint.includes("abdominal pain") ||
    complaint.includes("stomach pain")
  ) {
    suggestions.push({
      type: "investigation",
      text: "Ultrasound Abdomen",
      confidence: "medium",
      reason: "Visualize abdominal organs",
    });

    if (complaint.includes("diarrhea") || complaint.includes("vomiting")) {
      suggestions.push({
        type: "diagnosis",
        text: "Acute Gastroenteritis (K52.9)",
        confidence: "high",
        reason: "Common with GI symptoms",
      });
    }
  }

  // Diabetes screening
  if (
    complaint.includes("frequent urination") ||
    complaint.includes("excessive thirst")
  ) {
    suggestions.push({
      type: "investigation",
      text: "Fasting Blood Glucose / HbA1c",
      confidence: "high",
      reason: "Screen for diabetes mellitus",
    });
  }

  // Respiratory symptoms
  if (
    complaint.includes("shortness of breath") ||
    complaint.includes("breathing difficulty")
  ) {
    suggestions.push({
      type: "investigation",
      text: "Pulse Oximetry / ABG",
      confidence: "high",
      reason: "Assess oxygenation status",
    });
    suggestions.push({
      type: "investigation",
      text: "Chest X-Ray",
      confidence: "high",
      reason: "Rule out pneumonia or other lung pathology",
    });
  }

  return suggestions;
};

export function ClinicalSuggestions({
  chiefComplaint,
  onApplySuggestion,
  className,
}: ClinicalSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (chiefComplaint && chiefComplaint.length > 10) {
      const newSuggestions = generateSuggestions(chiefComplaint);
      setSuggestions(newSuggestions);
      setVisible(newSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setVisible(false);
    }
  }, [chiefComplaint]);

  const activeSuggestions = suggestions.filter((s) => !dismissed.has(s.text));

  if (!visible || activeSuggestions.length === 0) {
    return null;
  }

  const confidenceColors = {
    high: "bg-green-100 text-green-800 border-green-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    low: "bg-gray-100 text-gray-800 border-gray-300",
  };

  const typeIcons = {
    diagnosis: "🔍",
    investigation: "🧪",
    treatment: "💊",
  };

  return (
    <Card className={cn("border-blue-200 bg-blue-50/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-blue-600" />
            Clinical Decision Support
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisible(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          AI-suggested actions based on chief complaint
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {activeSuggestions.map((suggestion, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow"
          >
            <div className="text-lg mt-0.5">{typeIcons[suggestion.type]}</div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{suggestion.text}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    confidenceColors[suggestion.confidence],
                  )}
                >
                  {suggestion.confidence === "high" && (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  )}
                  {suggestion.confidence === "medium" && (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {suggestion.confidence} confidence
                </Badge>
              </div>
              {suggestion.reason && (
                <p className="text-xs text-muted-foreground">
                  {suggestion.reason}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              {onApplySuggestion && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApplySuggestion(suggestion)}
                  className="h-7 text-xs"
                >
                  Apply
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setDismissed(new Set([...dismissed, suggestion.text]))
                }
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
