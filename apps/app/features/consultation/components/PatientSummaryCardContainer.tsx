import * as React from "react";
import { differenceInYears } from "date-fns";
import {
  PatientSummaryCardUI,
  PatientSummaryData,
  Allergy,
  ChronicCondition,
  VitalSign,
} from "./PatientSummaryCardUI";

interface PatientSummaryCardContainerProps {
  patient: PatientSummaryData;
  allergies?: Allergy[];
  chronicConditions?: ChronicCondition[];
  currentMedications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  latestVitals?: VitalSign[];
  lastVisit?: Date;
  className?: string;
}

export function PatientSummaryCardContainer({
  patient,
  allergies = [],
  chronicConditions = [],
  currentMedications = [],
  latestVitals = [],
  lastVisit,
  className,
}: PatientSummaryCardContainerProps) {
  const [expanded, setExpanded] = React.useState(false);

  const age = patient.dateOfBirth
    ? differenceInYears(new Date(), new Date(patient.dateOfBirth))
    : null;

  const activeConditions = chronicConditions.filter(
    (c) => c.status !== "resolved",
  );

  return (
    <PatientSummaryCardUI
      patient={patient}
      age={age}
      allergies={allergies}
      activeConditions={activeConditions}
      currentMedications={currentMedications}
      latestVitals={latestVitals}
      lastVisit={lastVisit}
      expanded={expanded}
      onToggleExpanded={() => setExpanded(!expanded)}
      className={className}
    />
  );
}
