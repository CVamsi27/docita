import { useEffect, useState } from "react";
import { ClinicalSuggestionsUI, Suggestion } from "./ClinicalSuggestionsUI";

interface ClinicalSuggestionsContainerProps {
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

export function ClinicalSuggestionsContainer({
  chiefComplaint,
  onApplySuggestion,
  className,
}: ClinicalSuggestionsContainerProps) {
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

  const handleDismiss = (text: string) => {
    setDismissed(new Set([...dismissed, text]));
  };

  return (
    <ClinicalSuggestionsUI
      suggestions={activeSuggestions}
      visible={visible}
      onHide={() => setVisible(false)}
      onDismiss={handleDismiss}
      onApply={onApplySuggestion}
      className={className}
    />
  );
}
