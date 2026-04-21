

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
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";

interface PatientHistorySummaryCardProps {
  conditions?: PatientMedicalCondition[];
  allergies?: PatientAllergy[];
  surgeries?: PatientSurgicalHistory[];
  familyHistory?: PatientFamilyHistory[];
  socialHistory?: PatientSocialHistory | null;
  compact?: boolean;
  className?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  MILD: "badge-warning border",
  MODERATE: "tier-enterprise border",
  SEVERE: "badge-danger border",
  LIFE_THREATENING: "bg-destructive/25 text-destructive border-destructive/50",
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
      <Card
        className={`overflow-hidden ${hasAllergies ? "border-destructive/30" : "border-success/30"}`}
      >
        <CardHeader className="py-2.5 px-3 bg-muted/30">
          <CardTitle className="text-sm flex items-center gap-2 font-semibold">
            <AlertTriangle
              className={`h-4 w-4 ${hasAllergies ? "text-destructive" : "text-success"}`}
            />
            Allergies
            {hasAllergies && (
              <Badge
                variant="secondary"
                className="ml-auto h-5 px-1.5 text-[var(--fs-2xs)]"
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
                    <span className="ml-1 opacity-70 text-[var(--fs-2xs)]">
                      ({humanizeUiLabel(allergy.severity)})
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-success">
              <span className="font-medium">No known allergies</span>
            </div>
          )}
        </CardContent>
      </Card>

      {hasConditions && (
        <Collapsible defaultOpen={!compact}>
          <Card>
            <CollapsibleTrigger className="w-full hover:bg-muted/50 transition-colors">
              <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-foreground font-medium">
                  <Heart className="h-4 w-4 text-destructive" />
                  Conditions
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 text-[var(--fs-2xs)]"
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

      {hasSurgeries && (
        <Collapsible defaultOpen={!compact}>
          <Card>
            <CollapsibleTrigger className="w-full hover:bg-muted/50 transition-colors">
              <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-foreground font-medium">
                  <Stethoscope className="h-4 w-4 text-info" />
                  Surgeries
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 text-[var(--fs-2xs)]"
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
                          <span className="text-muted-foreground text-[var(--fs-2xs)]">
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

      {hasFamilyHistory && (
        <Collapsible defaultOpen={!compact}>
          <Card>
            <CollapsibleTrigger className="w-full hover:bg-muted/50 transition-colors">
              <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-foreground font-medium">
                  <Users className="h-4 w-4 text-primary" />
                  Family History
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 text-[var(--fs-2xs)]"
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

      {hasSocialHistory && (
        <Collapsible defaultOpen={!compact}>
          <Card>
            <CollapsibleTrigger className="w-full hover:bg-muted/50 transition-colors">
              <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-foreground font-medium">
                  <Coffee className="h-4 w-4 text-warning" />
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
                        <span className="text-muted-foreground text-[var(--fs-2xs)] uppercase tracking-wider">
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
                        <span className="text-muted-foreground text-[var(--fs-2xs)] uppercase tracking-wider">
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
                      <span className="text-muted-foreground text-[var(--fs-2xs)] uppercase tracking-wider">
                        Occupation
                      </span>
                      <span className="font-medium">
                        {socialHistory.occupation}
                      </span>
                    </div>
                  )}
                  {socialHistory?.dietaryRestrictions && (
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[var(--fs-2xs)] uppercase tracking-wider">
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
