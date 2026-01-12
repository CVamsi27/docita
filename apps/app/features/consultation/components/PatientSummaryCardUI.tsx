import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Activity,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Droplet,
  Heart,
  Mail,
  Phone,
  Pill,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";

export interface Allergy {
  id: string;
  allergen: string;
  severity: "mild" | "moderate" | "severe";
  reaction?: string;
}

export interface ChronicCondition {
  id: string;
  name: string;
  diagnosedDate?: string;
  status: "active" | "managed" | "resolved";
}

export interface VitalSign {
  type: string;
  value: string;
  unit: string;
  date: Date;
  status?: "normal" | "elevated" | "low" | "critical";
}

export interface PatientSummaryData {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string | Date;
  gender?: string;
  bloodGroup?: string;
  emergencyContact?: string;
}

export interface PatientSummaryCardUIProps {
  patient: PatientSummaryData;
  age: number | null;
  allergies: Allergy[];
  activeConditions: ChronicCondition[];
  currentMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  latestVitals: VitalSign[];
  lastVisit?: Date;
  expanded: boolean;
  onToggleExpanded: () => void;
  className?: string;
}

const SEVERITY_COLORS = {
  mild: "bg-yellow-100 text-yellow-800 border-yellow-300",
  moderate: "bg-orange-100 text-orange-800 border-orange-300",
  severe: "bg-red-100 text-red-800 border-red-300",
};

const VITAL_STATUS_COLORS = {
  normal: "text-green-600",
  elevated: "text-orange-600",
  low: "text-blue-600",
  critical: "text-red-600 animate-pulse",
};

export function PatientSummaryCardUI({
  patient,
  age,
  allergies,
  activeConditions,
  currentMedications,
  latestVitals,
  lastVisit,
  expanded,
  onToggleExpanded,
  className,
}: PatientSummaryCardUIProps) {
  const hasAllergies = allergies.length > 0;
  const hasSevereAllergy = allergies.some((a) => a.severity === "severe");

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 space-y-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{patient.name}</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {age && <span>{age}y</span>}
                {patient.gender && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{patient.gender}</span>
                  </>
                )}
                {patient.bloodGroup && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Droplet className="h-3 w-3" />
                      {patient.bloodGroup}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {hasSevereAllergy && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-red-600 animate-pulse">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-medium">ALERT</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Patient has severe allergies!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Allergies - Always Visible */}
        {hasAllergies && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <AlertTriangle className="h-3 w-3" />
              Allergies
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allergies.map((allergy) => (
                <TooltipProvider key={allergy.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs cursor-help",
                          SEVERITY_COLORS[allergy.severity],
                        )}
                      >
                        {allergy.allergen}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{allergy.allergen}</p>
                      <p className="text-xs capitalize">
                        Severity: {allergy.severity}
                      </p>
                      {allergy.reaction && (
                        <p className="text-xs">Reaction: {allergy.reaction}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        )}

        {/* Chronic Conditions - Always Visible */}
        {activeConditions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Heart className="h-3 w-3" />
              Chronic Conditions
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeConditions.map((condition) => (
                <Badge
                  key={condition.id}
                  variant="secondary"
                  className="text-xs"
                >
                  {condition.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Section */}
        {expanded && (
          <div className="space-y-3 pt-2 border-t animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Contact Info */}
            {(patient.phone || patient.email) && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contact
                </div>
                <div className="space-y-1 text-sm">
                  {patient.phone && (
                    <a
                      href={`tel:${patient.phone}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                      {patient.phone}
                    </a>
                  )}
                  {patient.email && (
                    <a
                      href={`mailto:${patient.email}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Mail className="h-3 w-3" />
                      {patient.email}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Current Medications */}
            {currentMedications.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Pill className="h-3 w-3" />
                  Current Medications ({currentMedications.length})
                </div>
                <div className="space-y-1">
                  {currentMedications.slice(0, 5).map((med, index) => (
                    <div
                      key={index}
                      className="text-xs bg-muted/50 rounded px-2 py-1.5"
                    >
                      <span className="font-medium">{med.name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        • {med.dosage} • {med.frequency}
                      </span>
                    </div>
                  ))}
                  {currentMedications.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{currentMedications.length - 5} more medications
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Latest Vitals */}
            {latestVitals.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Activity className="h-3 w-3" />
                  Latest Vitals
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {latestVitals.map((vital, index) => (
                    <div
                      key={index}
                      className="bg-muted/50 rounded px-2 py-1.5 text-xs"
                    >
                      <span className="text-muted-foreground">
                        {vital.type}:
                      </span>{" "}
                      <span
                        className={cn(
                          "font-medium",
                          vital.status && VITAL_STATUS_COLORS[vital.status],
                        )}
                      >
                        {vital.value} {vital.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Visit */}
            {lastVisit && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Calendar className="h-3 w-3" />
                <span>Last visit: {format(lastVisit, "MMM d, yyyy")}</span>
              </div>
            )}
          </div>
        )}

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={onToggleExpanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show More
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Export sub-components with re-exports
export type CodeStatus =
  | "FULL_CODE"
  | "DNR"
  | "DNI"
  | "DNR_DNI"
  | "COMFORT_CARE";

export const CODE_STATUS_LABELS: Record<CodeStatus, string> = {
  FULL_CODE: "Full Code",
  DNR: "DNR (Do Not Resuscitate)",
  DNI: "DNI (Do Not Intubate)",
  DNR_DNI: "DNR/DNI",
  COMFORT_CARE: "Comfort Care Only",
};

export const CODE_STATUS_COLORS: Record<
  CodeStatus,
  { bg: string; border: string; text: string; icon: string }
> = {
  FULL_CODE: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    icon: "text-green-600",
  },
  DNR: {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-900",
    icon: "text-red-600",
  },
  DNI: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-900",
    icon: "text-orange-600",
  },
  DNR_DNI: {
    bg: "bg-red-100",
    border: "border-red-400",
    text: "text-red-900",
    icon: "text-red-700",
  },
  COMFORT_CARE: {
    bg: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-900",
    icon: "text-purple-600",
  },
};

export function AllergyAlertUI({
  allergies,
  className,
}: {
  allergies: Allergy[];
  className?: string;
}) {
  const severeAllergies = allergies.filter((a) => a.severity === "severe");
  const otherAllergies = allergies.filter((a) => a.severity !== "severe");

  if (allergies.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        severeAllergies.length > 0
          ? "bg-red-50 border border-red-200 text-red-800"
          : "bg-yellow-50 border border-yellow-200 text-yellow-800",
        className,
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <div className="flex-1 text-sm">
        <span className="font-medium">Allergies: </span>
        {severeAllergies.length > 0 && (
          <span className="text-red-700">
            {severeAllergies.map((a) => a.allergen).join(", ")}
            {otherAllergies.length > 0 && ", "}
          </span>
        )}
        {otherAllergies.map((a) => a.allergen).join(", ")}
      </div>
    </div>
  );
}

export function CodeStatusAlertUI({
  codeStatus,
  updatedAt,
  updatedBy,
  className,
  compact = false,
}: {
  codeStatus: CodeStatus;
  updatedAt?: Date | string;
  updatedBy?: string;
  className?: string;
  compact?: boolean;
}) {
  if (compact && codeStatus === "FULL_CODE") return null;

  const colors = CODE_STATUS_COLORS[codeStatus];
  const label = CODE_STATUS_LABELS[codeStatus];
  const isCritical = ["DNR", "DNI", "DNR_DNI", "COMFORT_CARE"].includes(
    codeStatus,
  );

  const Icon = codeStatus === "FULL_CODE" ? ShieldCheck : ShieldAlert;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border",
        colors.bg,
        colors.border,
        colors.text,
        isCritical && "animate-pulse",
        className,
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", colors.icon)} />
      <div className="flex-1 text-sm">
        <span className="font-bold uppercase tracking-wide">Code Status: </span>
        <span className="font-semibold">{label}</span>
        {!compact && updatedAt && (
          <span className="ml-2 text-xs opacity-75">
            (Updated:{" "}
            {typeof updatedAt === "string"
              ? new Date(updatedAt).toLocaleDateString()
              : updatedAt.toLocaleDateString()}
            {updatedBy && ` by ${updatedBy}`})
          </span>
        )}
      </div>
      {isCritical && (
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-bold border-current uppercase",
            colors.text,
          )}
        >
          CRITICAL
        </Badge>
      )}
    </div>
  );
}
