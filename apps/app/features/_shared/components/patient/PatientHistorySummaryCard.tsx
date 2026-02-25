/**
 * Patient History Summary Card
 * Shared component for displaying patient history consistently
 * Used in both Patient Details and Consultation views
 */

"use client";

import { FC } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  AlertTriangle,
  ChevronDown,
  Coffee,
  Heart,
  Stethoscope,
  Users,
} from "lucide-react";
import {
  ALCOHOL_USE_STATUS_LABELS,
  AlcoholUseStatus,
  PatientAllergy,
  PatientFamilyHistory,
  PatientMedicalCondition,
  PatientSocialHistory,
  PatientSurgicalHistory,
  SMOKING_STATUS_LABELS,
  SmokingStatus,
} from "@workspace/types";

interface PatientHistorySummaryCardProps {
  conditions?: PatientMedicalCondition[];
  allergies?: PatientAllergy[];
  surgeries?: PatientSurgicalHistory[];
  familyHistory?: PatientFamilyHistory[];
  socialHistory?: PatientSocialHistory | null;
  compact?: boolean;
  className?: string;
}

// Severity color mapping
const SEVERITY_COLORS: Record<string, string> = {
  MILD: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300",
  MODERATE:
    "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300",
  SEVERE:
    "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300",
  LIFE_THREATENING:
    "bg-red-200 text-red-900 border-red-500 dark:bg-red-950/50 dark:text-red-200",
};

export const PatientHistorySummaryCard: FC<PatientHistorySummaryCardProps> = ({
  conditions = [],
  allergies = [],
  surgeries = [],
  familyHistory = [],
  socialHistory,
  compact = false,
  className = "",
}) => {
  const hasConditions = conditions.length > 0;
  const hasAllergies = allergies.length > 0;
  const hasSurgeries = surgeries.length > 0;
  const hasFamilyHistory = familyHistory.length > 0;
  const hasSocialHistory =
    socialHistory &&
    (socialHistory.smokingStatus ||
      socialHistory.alcoholUse ||
      socialHistory.occupation);

  const hasAnyHistory =
    hasConditions ||
    hasAllergies ||
    hasSurgeries ||
    hasFamilyHistory ||
    hasSocialHistory;

  if (!hasAnyHistory && compact) {
    return (
      <div
        className={`text-sm text-muted-foreground italic p-4 border rounded-lg bg-muted/5 text-center ${className}`}
      >
        No medical history recorded
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Allergies - Always shown prominently */}
      <Card
        className={`overflow-hidden ${hasAllergies ? "border-red-200 dark:border-red-900" : "border-green-200 dark:border-green-900"}`}
      >
        <CardHeader className="py-2.5 px-3 bg-muted/30">
          <CardTitle className="text-sm flex items-center gap-2 font-semibold">
            <AlertTriangle
              className={`h-4 w-4 ${hasAllergies ? "text-red-500" : "text-green-500"}`}
            />
            Allergies
            {hasAllergies && (
              <Badge
                variant="secondary"
                className="ml-auto h-5 px-1.5 text-[10px]"
              >
                {allergies.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-3">
          {hasAllergies ? (
            <div className="flex flex-wrap gap-1.5">
              {allergies.map((allergy, i) => (
                <Badge
                  key={allergy.id || i}
                  variant="outline"
                  className={`text-xs ${SEVERITY_COLORS[allergy.severity || "MODERATE"]}`}
                >
                  {allergy.allergen}
                  {allergy.severity && (
                    <span className="ml-1 opacity-70 text-[10px]">
                      ({allergy.severity.toLowerCase().replace("_", " ")})
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <span className="font-medium">NKA (No Known Allergies)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medical Conditions */}
      {hasConditions && (
        <Collapsible defaultOpen={!compact}>
          <Card>
            <CollapsibleTrigger className="w-full hover:bg-muted/50 transition-colors">
              <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-foreground font-medium">
                  <Heart className="h-4 w-4 text-rose-500" />
                  Conditions
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 text-[10px]"
                  >
                    {conditions.length}
                  </Badge>
                </CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-3 pb-3 pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((condition, i) => (
                    <Badge
                      key={condition.id || i}
                      variant="outline"
                      className="text-xs bg-background hover:bg-muted/50"
                    >
                      {condition.conditionName}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Surgical History */}
      {hasSurgeries && (
        <Collapsible defaultOpen={!compact}>
          <Card>
            <CollapsibleTrigger className="w-full hover:bg-muted/50 transition-colors">
              <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-foreground font-medium">
                  <Stethoscope className="h-4 w-4 text-blue-500" />
                  Surgeries
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 text-[10px]"
                  >
                    {surgeries.length}
                  </Badge>
                </CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-3 pb-3 pt-0">
                <div className="space-y-1 pt-1">
                  {surgeries
                    .slice(0, compact ? 3 : undefined)
                    .map((surgery, i) => (
                      <div
                        key={surgery.id || i}
                        className="text-xs flex justify-between items-center py-1 border-b last:border-0 border-border/50"
                      >
                        <span className="font-medium">
                          {surgery.procedureName}
                        </span>
                        {surgery.procedureDate && (
                          <span className="text-muted-foreground text-[10px]">
                            {new Date(surgery.procedureDate).getFullYear()}
                          </span>
                        )}
                      </div>
                    ))}
                  {compact && surgeries.length > 3 && (
                    <span className="text-xs text-muted-foreground block pt-1 pl-1">
                      +{surgeries.length - 3} more...
                    </span>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Family History */}
      {hasFamilyHistory && (
        <Collapsible defaultOpen={!compact}>
          <Card>
            <CollapsibleTrigger className="w-full hover:bg-muted/50 transition-colors">
              <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-foreground font-medium">
                  <Users className="h-4 w-4 text-violet-500" />
                  Family History
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 text-[10px]"
                  >
                    {familyHistory.length}
                  </Badge>
                </CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-3 pb-3 pt-0">
                <div className="space-y-1 pt-1">
                  {familyHistory
                    .slice(0, compact ? 3 : undefined)
                    .map((history, i) => (
                      <div
                        key={history.id || i}
                        className="text-xs py-1 border-b last:border-0 border-border/50"
                      >
                        <span className="font-medium">{history.condition}</span>
                        <span className="text-muted-foreground ml-1">
                          ({history.relationship})
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Social History */}
      {hasSocialHistory && (
        <Collapsible defaultOpen={!compact}>
          <Card>
            <CollapsibleTrigger className="w-full hover:bg-muted/50 transition-colors">
              <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-foreground font-medium">
                  <Coffee className="h-4 w-4 text-amber-600" />
                  Social History
                </CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-3 pb-3 pt-0">
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  {socialHistory?.smokingStatus &&
                    socialHistory.smokingStatus !== "UNKNOWN" && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                          Smoking
                        </span>
                        <span className="font-medium">
                          {SMOKING_STATUS_LABELS[
                            socialHistory.smokingStatus as SmokingStatus
                          ] || socialHistory.smokingStatus}
                        </span>
                      </div>
                    )}
                  {socialHistory?.alcoholUse &&
                    socialHistory.alcoholUse !== "UNKNOWN" && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                          Alcohol
                        </span>
                        <span className="font-medium">
                          {ALCOHOL_USE_STATUS_LABELS[
                            socialHistory.alcoholUse as AlcoholUseStatus
                          ] || socialHistory.alcoholUse}
                        </span>
                      </div>
                    )}
                  {socialHistory?.occupation && (
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                        Occupation
                      </span>
                      <span className="font-medium">
                        {socialHistory.occupation}
                      </span>
                    </div>
                  )}
                  {socialHistory?.dietaryRestrictions && (
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                        Diet
                      </span>
                      <span className="font-medium">
                        {socialHistory.dietaryRestrictions}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
};

export default PatientHistorySummaryCard;
