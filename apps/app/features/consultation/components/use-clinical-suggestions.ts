"use client";

import { useEffect, useState } from "react";
import type { Suggestion } from "./ClinicalSuggestionsUI";
import { generateSuggestions } from "./clinical-suggestions-helpers";

export function useClinicalSuggestions(chiefComplaint: string) {
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

  return {
    suggestions: activeSuggestions,
    visible,
    show: () => setVisible(true),
    handleHide: () => setVisible(false),
    handleDismiss,
  };
}
