import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { AlertTriangle, Droplet, User } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import {
  // CODE_STATUS_COLORS,
  // CODE_STATUS_LABELS,
  CodeStatus,
  CodeStatusAlertUI,
} from "./summary/CodeStatusAlertUI";
import { AllergyAlertUI } from "./summary/AllergyAlertUI";
import { SummaryVitals } from "./shared/SummaryVitals";
import { SummaryMedications } from "./shared/SummaryMedications";
import { SummaryConditions } from "./shared/SummaryConditions";

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
  codeStatus?: CodeStatus;
}

const SEVERITY_COLORS = {
  mild: "bg-yellow-100 text-yellow-800 border-yellow-300",
  moderate: "bg-orange-100 text-orange-800 border-orange-300",
  severe: "bg-red-100 text-red-800 border-red-300",
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
  // onToggleExpanded,
  className,
  codeStatus,
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

      <CardContent className="space-y-6">
        {/* Top Allergies Badges (Optional - keeping if it was intended) */}
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
                          SEVERITY_COLORS[allergy.severity]
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

        {/* Main Grid Columns */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            {/* Detailed Alerts */}
            <div className="space-y-2">
              <AllergyAlertUI allergies={allergies} />
            </div>
            {codeStatus && <CodeStatusAlertUI codeStatus={codeStatus} />}
          </div>

          {/* Conditions Column */}
          <SummaryConditions conditions={activeConditions} />

          {/* Medications Column */}
          <SummaryMedications medications={currentMedications} />

          {/* Vitals Column */}
          <SummaryVitals vitals={latestVitals} />
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-6 pt-6 border-t grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="text-sm font-medium mb-2">Contact Information</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                {patient.phone && <div>📞 {patient.phone}</div>}
                {patient.email && <div>✉️ {patient.email}</div>}
                {patient.emergencyContact && (
                  <div>🚑 Emergency: {patient.emergencyContact}</div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Last Visit</h4>
              {lastVisit ? (
                <div className="text-sm text-muted-foreground">
                  {format(lastVisit, "PPP")}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No previous visits
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Re-export for backward compatibility
export { AllergyAlertUI, CodeStatusAlertUI };
export type { CodeStatus } from "./summary/CodeStatusAlertUI";
export {
  CODE_STATUS_LABELS,
  CODE_STATUS_COLORS,
} from "./summary/CodeStatusAlertUI";
