/**
 * Patient Allergy Alert - UI Component
 * Pure presentational component for displaying patient allergy warnings
 */

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";

interface PatientAllergyAlertUIProps {
  allergies: string[];
  patientName: string;
}

export function PatientAllergyAlertUI({
  allergies,
  patientName,
}: PatientAllergyAlertUIProps) {
  if (!allergies || allergies.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Allergy Alert - {patientName}</AlertTitle>
      <AlertDescription>
        <div className="flex flex-wrap gap-2 mt-2">
          {allergies.map((allergy, index) => (
            <Badge key={index} variant="destructive">
              {allergy}
            </Badge>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}
