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

  codeStatus?: string;
  codeStatusLabel?: string;
  isFullCode: boolean;
  isolationStatus?: string;
  isolationStatusLabel?: string;
  isIsolation: boolean;
  fallRisk?: boolean;
  allergies?: string;
  hasAllergies: boolean;

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
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b -mx-6 px-6 py-4 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary border border-primary/10">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {lastName}, {firstName}
              </h1>
              <Badge
                variant="secondary"
                className="font-mono text-xs font-normal text-muted-foreground bg-muted/50 border-input"
              >
                MRN: {mrn || "N/A"}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <span className="font-medium text-foreground">{age}</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="capitalize">{gender?.toLowerCase()}</span>
              <span className="text-muted-foreground/40">•</span>
              <span>DOB: {new Date(dateOfBirth).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap gap-2 items-center justify-end">
            {codeStatusLabel && (
              <Badge
                className={`px-2.5 py-0.5 font-medium border ${
                  isFullCode
                    ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50"
                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-50"
                }`}
              >
                <ShieldAlert className="w-3 h-3 mr-1.5" />
                {codeStatusLabel}
              </Badge>
            )}

            {isIsolation && isolationStatusLabel && (
              <Badge className="px-2.5 py-0.5 bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-50 font-medium border">
                <AlertTriangle className="w-3 h-3 mr-1.5" />
                {isolationStatusLabel}
              </Badge>
            )}

            {fallRisk && (
              <Badge className="px-2.5 py-0.5 bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-50 font-medium border">
                ⚠️ FALL RISK
              </Badge>
            )}

            <Badge
              variant={hasAllergies ? "destructive" : "secondary"}
              className={`px-2.5 py-0.5 font-medium border ${
                hasAllergies
                  ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-50"
                  : "bg-green-50 text-green-700 border-green-200 hover:bg-green-50"
              }`}
            >
              {hasAllergies ? `Allergies: ${allergies}` : "NKA"}
            </Badge>
          </div>

          {(insuranceProvider || emergencyContactName) && (
            <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
              {insuranceProvider && (
                <div
                  className="flex items-center gap-1.5"
                  title={
                    insurancePolicyNumber
                      ? `Policy: ${insurancePolicyNumber}`
                      : undefined
                  }
                >
                  <Building2 className="h-3 w-3 opacity-70" />
                  <span className="truncate max-w-[150px]">
                    {insuranceProvider}
                  </span>
                </div>
              )}
              {emergencyContactName && (
                <div
                  className="flex items-center gap-1.5"
                  title={`${emergencyContactRelation}: ${emergencyContactPhone}`}
                >
                  <Phone className="h-3 w-3 opacity-70" />
                  <span className="truncate max-w-[150px]">
                    {emergencyContactName}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {(insuranceProvider || emergencyContactName) && (
        <div className="md:hidden mt-4 pt-3 border-t grid grid-cols-1 gap-2 text-xs text-muted-foreground">
          {insuranceProvider && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3" />
              <span>{insuranceProvider}</span>
            </div>
          )}
          {emergencyContactName && (
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3" />
              <span>{emergencyContactName}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
