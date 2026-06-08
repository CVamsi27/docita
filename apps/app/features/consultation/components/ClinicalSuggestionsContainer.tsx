import { ClinicalSuggestionsUI, type Suggestion } from "./ClinicalSuggestionsUI";
import { useClinicalSuggestions } from "./use-clinical-suggestions";

interface ClinicalSuggestionsContainerProps {
  chiefComplaint: string;
  onApplySuggestion?: (suggestion: Suggestion) => void;
  className?: string;
}

export function ClinicalSuggestionsContainer({
  chiefComplaint,
  onApplySuggestion,
  className,
}: ClinicalSuggestionsContainerProps) {
  const { suggestions, visible, handleHide, handleDismiss } =
    useClinicalSuggestions(chiefComplaint);

  return (
    <ClinicalSuggestionsUI
      suggestions={suggestions}
      visible={visible}
      onHide={handleHide}
      onDismiss={handleDismiss}
      onApply={onApplySuggestion}
      className={className}
    />
  );
}
