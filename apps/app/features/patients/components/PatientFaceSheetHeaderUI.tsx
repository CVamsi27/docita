/**
 * Patient Face Sheet Header - UI Component
 * Pure presentational component for displaying IPD patient header with safety alerts
 */

import { Badge } from "@workspace/ui/components/badge";
import { AlertTriangle, Building2, Phone, ShieldAlert } from "lucide-react";

interface PatientFaceSheetHeaderUIProps {
  firstName: string;
  lastName: string;
  mrn?: string;
  age: number | string;
  gender: string;
  dateOfBirth: Date | string;
  initials: string;

  // Safety indicators
  codeStatus?: string;
  codeStatusLabel?: string;
  isFullCode: boolean;
  isolationStatus?: string;
  isolationStatusLabel?: string;
  isIsolation: boolean;
  fallRisk?: boolean;
  allergies?: string;
  hasAllergies: boolean;

  // Additional info
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

export function PatientFaceSheetHeaderUI(props: PatientFaceSheetHeaderUIProps) {
  const {
    firstName,
    lastName,
    mrn,
    age,
    gender,
    dateOfBirth,
    initials,
    codeStatusLabel,
    isFullCode,
    isolationStatusLabel,
    isIsolation,
    fallRisk,
    allergies,
    hasAllergies,
    insuranceProvider,
    insurancePolicyNumber,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelation,
  } = props;

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b shadow-sm pb-4 pt-2 -mx-6 px-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        {/* Patient Identity */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary border-2 border-primary/20">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {lastName}, {firstName}
              </h1>
              <Badge variant="outline" className="font-mono text-xs">
                MRN: {mrn || "N/A"}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
              <span className="font-medium text-foreground">{age}</span>
              <span>•</span>
              <span>{gender}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="font-medium text-xs">DOB:</span>{" "}
                {new Date(dateOfBirth).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Safety Alerts Banner */}
        <div className="flex flex-wrap gap-2 items-center justify-end">
          {/* Code Status Badge */}
          {codeStatusLabel && (
            <Badge
              className={`px-3 py-1 font-bold border-2 ${
                isFullCode
                  ? "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100"
                  : "bg-red-100 text-red-700 border-red-200 hover:bg-red-100"
              }`}
            >
              <ShieldAlert className="w-3 h-3 mr-1.5" />
              {codeStatusLabel}
            </Badge>
          )}

          {/* Isolation Badge */}
          {isIsolation && isolationStatusLabel && (
            <Badge className="px-3 py-1 bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 font-bold border-2">
              <AlertTriangle className="w-3 h-3 mr-1.5" />
              {isolationStatusLabel}
            </Badge>
          )}

          {/* Fall Risk */}
          {fallRisk && (
            <Badge className="px-3 py-1 bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 font-bold border-2">
              ⚠️ FALL RISK
            </Badge>
          )}

          {/* Allergies */}
          <Badge
            variant={hasAllergies ? "destructive" : "secondary"}
            className={`px-3 py-1 font-bold border-2 ${
              hasAllergies
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-green-50 text-green-700 border-green-200"
            }`}
          >
            {hasAllergies
              ? `Allergies: ${allergies}`
              : "NKA (No Known Allergies)"}
          </Badge>
        </div>
      </div>

      {/* Quick Info Bar - Insurance & Emergency */}
      {(insuranceProvider || emergencyContactName) && (
        <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
          {insuranceProvider && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3" />
              <span className="font-semibold">Insurance:</span>{" "}
              {insuranceProvider}
              {insurancePolicyNumber && ` (Policy: ${insurancePolicyNumber})`}
            </div>
          )}
          {emergencyContactName && (
            <div className="flex items-center gap-2 justify-end">
              <Phone className="h-3 w-3" />
              <span className="font-semibold">Emergency:</span>{" "}
              {emergencyContactName}
              {emergencyContactPhone && ` (${emergencyContactPhone})`}
              {emergencyContactRelation && ` - ${emergencyContactRelation}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
