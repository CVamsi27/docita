import { useState } from "react";
import {
  PatientContextCardUI,
  PatientContextData,
} from "./PatientContextCardUI";

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
