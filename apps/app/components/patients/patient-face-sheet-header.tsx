"use client";

import { Badge } from "@workspace/ui/components/badge";
import { AlertTriangle, ShieldAlert, Phone, Building2 } from "lucide-react";
import type { Patient } from "@workspace/types";
import { ISOLATION_STATUS_LABELS, CODE_STATUS_LABELS } from "@workspace/types";

interface PatientFaceSheetHeaderProps {
  patient: Patient;
  age: number | string;
  initials: string;
}

export function PatientFaceSheetHeader({
  patient,
  age,
  initials,
}: PatientFaceSheetHeaderProps) {
  // Parsing safety indicators
  const isFullCode = patient.codeStatus === "FULL_CODE";
  const hasAllergies = patient.allergies && patient.allergies.length > 0;
  const isIsolation =
    patient.isolationStatus && patient.isolationStatus !== "NONE";

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm pb-4 pt-2 -mx-6 px-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        {/* Patient Identity */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary border-2 border-primary/20">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {patient.lastName}, {patient.firstName}
              </h1>
              <Badge variant="outline" className="font-mono text-xs">
                MRN: {patient.mrn || "N/A"}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
              <span className="font-medium text-foreground">{age} yrs</span>
              <span>•</span>
              <span>{patient.gender}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="font-medium text-xs">DOB:</span>{" "}
                {new Date(patient.dateOfBirth).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Safety Alerts Banner */}
        <div className="flex flex-wrap gap-2 items-center justify-end">
          {/* Code Status Badge */}
          {patient.codeStatus && (
            <Badge
              className={`px-3 py-1 font-bold border-2 ${
                isFullCode
                  ? "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100"
                  : "bg-red-100 text-red-700 border-red-200 hover:bg-red-100"
              }`}
            >
              <ShieldAlert className="w-3 h-3 mr-1.5" />
              {CODE_STATUS_LABELS[patient.codeStatus]}
            </Badge>
          )}

          {/* Isolation Badge */}
          {isIsolation && (
            <Badge className="px-3 py-1 bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 font-bold border-2">
              <AlertTriangle className="w-3 h-3 mr-1.5" />
              {ISOLATION_STATUS_LABELS[patient.isolationStatus]}
            </Badge>
          )}

          {/* Fall Risk */}
          {patient.fallRisk && (
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
              ? `Allergies: ${patient.allergies}`
              : "NKA (No Known Allergies)"}
          </Badge>
        </div>
      </div>

      {/* Quick Info Bar - Insurance & Emergency */}
      {(patient.insuranceProvider || patient.emergencyContactName) && (
        <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
          {patient.insuranceProvider && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3" />
              <span className="font-semibold">Insurance:</span>{" "}
              {patient.insuranceProvider}
              {patient.insurancePolicyNumber &&
                ` (Policy: ${patient.insurancePolicyNumber})`}
            </div>
          )}
          {patient.emergencyContactName && (
            <div className="flex items-center gap-2 justify-end">
              <Phone className="h-3 w-3" />
              <span className="font-semibold">Emergency:</span>{" "}
              {patient.emergencyContactName}
              {patient.emergencyContactPhone &&
                ` (${patient.emergencyContactPhone})`}
              {patient.emergencyContactRelation &&
                ` - ${patient.emergencyContactRelation}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
