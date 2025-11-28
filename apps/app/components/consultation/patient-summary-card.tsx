"use client";

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
  AlertTriangle,
  Heart,
  Pill,
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Mail,
  Droplet,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { format, differenceInYears } from "date-fns";

interface Allergy {
  id: string;
  allergen: string;
  severity: "mild" | "moderate" | "severe";
  reaction?: string;
}

interface ChronicCondition {
  id: string;
  name: string;
  diagnosedDate?: string;
  status: "active" | "managed" | "resolved";
}

interface VitalSign {
  type: string;
  value: string;
  unit: string;
  date: Date;
  status?: "normal" | "elevated" | "low" | "critical";
}

interface PatientSummaryCardProps {
  patient: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    dateOfBirth?: string | Date;
    gender?: string;
    bloodGroup?: string;
    emergencyContact?: string;
  };
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

export function PatientSummaryCard({
  patient,
  allergies = [],
  chronicConditions = [],
  currentMedications = [],
  latestVitals = [],
  lastVisit,
  className,
}: PatientSummaryCardProps) {
  const [expanded, setExpanded] = React.useState(false);

  const age = patient.dateOfBirth
    ? differenceInYears(new Date(), new Date(patient.dateOfBirth))
    : null;

  const hasAllergies = allergies.length > 0;
  const hasSevereAllergy = allergies.some((a) => a.severity === "severe");
  const activeConditions = chronicConditions.filter(
    (c) => c.status !== "resolved",
  );

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
          onClick={() => setExpanded(!expanded)}
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

// Compact alert banner for allergies - useful at top of consultation
export function AllergyAlert({
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
