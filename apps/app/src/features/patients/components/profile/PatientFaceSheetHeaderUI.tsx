import { Badge, Button, MicroLabel, SymbolTooltip, Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components";
import { AlertTriangle, Building2, ChevronLeft, Phone, ShieldAlert } from "lucide-react";
import { formatDate, formatGenderLabel } from "@/lib/formatters";

interface PatientFaceSheetHeaderUIProps {
  firstName: string;
  lastName: string;
  age: number | string;
  gender: string;
  dateOfBirth: Date | string;
  initials: string;
  mrn?: string;

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

  onBack?: () => void;
  actions?: React.ReactNode;
}

export function PatientFaceSheetHeaderUI(props: PatientFaceSheetHeaderUIProps) {
  const {
    firstName,
    lastName,
    age,
    gender,
    dateOfBirth,
    initials,
    mrn,
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
    onBack,
    actions,
  } = props;

  const allergiesLabel = hasAllergies
    ? `Allergies: ${allergies ?? ""}`.trim()
    : "NKA";

  return (
    <div className="sticky top-0 z-20 border-b bg-background/95 px-4 py-4 shadow-sm md:-mx-6 md:px-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div className="flex items-center gap-4">
          {onBack && (
            <SymbolTooltip label="Back">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                aria-label="Back"
                className="h-9 w-9 shrink-0 -ml-2 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SymbolTooltip>
          )}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-base font-bold text-foreground sm:h-14 sm:w-14 sm:text-lg">
            {initials}
          </div>
          <div className="min-w-0">
            <MicroLabel className="mb-0.5">Patient Record</MicroLabel>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="ui-page-title text-[var(--fs-lg)] sm:text-[var(--fs-2xl)] truncate text-foreground">
                {lastName}, {firstName}
              </h1>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <span className="font-medium text-foreground">{age}</span>
              <span className="text-muted-foreground/40">•</span>
              <span>{formatGenderLabel(gender)}</span>
              <span className="text-muted-foreground/40">•</span>
              <span>DOB: {formatDate(dateOfBirth)}</span>
              {mrn ? (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span
                    className="font-mono"
                    data-testid="patient-facesheet-mrn"
                  >
                    MRN: {mrn}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col items-start gap-2 md:w-auto md:items-end">
          <div className="flex flex-wrap gap-2 items-center justify-start md:justify-end">
            {codeStatusLabel && (
              <Badge
                className={`px-2.5 py-0.5 font-medium border ${
                  isFullCode
                    ? "badge-info"
                    : "badge-danger"
                }`}
              >
                <ShieldAlert className="w-3 h-3 mr-1.5" />
                {codeStatusLabel}
              </Badge>
            )}

            {isIsolation && isolationStatusLabel && (
              <Badge className="px-2.5 py-0.5 badge-warning font-medium border">
                <AlertTriangle className="w-3 h-3 mr-1.5" />
                {isolationStatusLabel}
              </Badge>
            )}

            {fallRisk && (
              <Badge className="px-2.5 py-0.5 badge-warning font-medium border">
                FALL RISK
              </Badge>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={hasAllergies ? "destructive" : "secondary"}
                  className={`px-2.5 py-0.5 font-medium border ${
                    hasAllergies ? "badge-danger" : "badge-success"
                  }`}
                >
                  {allergiesLabel.length > 34
                    ? `${allergiesLabel.slice(0, 33)}…`
                    : allergiesLabel}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{allergiesLabel}</TooltipContent>
            </Tooltip>
          </div>

          {(insuranceProvider || emergencyContactName) && (
            <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
              {insuranceProvider && (
                <SymbolTooltip
                  label={
                    insurancePolicyNumber
                      ? `${insuranceProvider} — Policy: ${insurancePolicyNumber}`
                      : insuranceProvider
                  }
                  side="bottom"
                >
                  <div className="flex cursor-default items-center gap-1.5">
                    <Building2 className="h-3 w-3 shrink-0 opacity-70" />
                    <span className="truncate max-w-[150px]">
                      {insuranceProvider}
                    </span>
                  </div>
                </SymbolTooltip>
              )}
              {emergencyContactName && (
                <SymbolTooltip
                  label={`${emergencyContactRelation ?? "Contact"}: ${emergencyContactPhone ?? ""}`}
                  side="bottom"
                >
                  <div className="flex cursor-default items-center gap-1.5">
                    <Phone className="h-3 w-3 shrink-0 opacity-70" />
                    <span className="truncate max-w-[150px]">
                      {emergencyContactName}
                    </span>
                  </div>
                </SymbolTooltip>
              )}
            </div>
          )}
          {actions && <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">{actions}</div>}
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
