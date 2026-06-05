import { useState } from "react";
import { PatientContextCardUI } from "./PatientContextCardUI";
import type { PatientContextData } from "./PatientContextCardUISections";

interface PatientContextCardContainerProps {
  patient: PatientContextData;
  className?: string;
  defaultExpanded?: boolean;
  showVitalsTrend?: boolean;
}

export function PatientContextCardContainer({
  patient,
  className,
  defaultExpanded = true,
  showVitalsTrend = false,
}: PatientContextCardContainerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <PatientContextCardUI
      patient={patient}
      isExpanded={isExpanded}
      onToggleExpand={() => setIsExpanded(!isExpanded)}
      className={className}
      showVitalsTrend={showVitalsTrend}
    />
  );
}
