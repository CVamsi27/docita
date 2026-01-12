import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Droplets,
  FileText,
  Heart,
  History,
  Pill,
  User,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Collapsible,
  CollapsibleContent,
} from "@workspace/ui/components/collapsible";
import { cn } from "@workspace/ui/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

export interface PatientCondition {
  name: string;
  duration?: string;
  isChronic?: boolean;
}

export interface PatientMedication {
  name: string;
  dosage: string;
  frequency: string;
}

export interface VitalReading {
  value: string;
  date: Date;
  isNormal?: boolean;
}

export interface PatientContextData {
  id: string;
  firstName: string;
  lastName: string;
  age?: number;
  gender?: "male" | "female" | "other";
  bloodGroup?: string;
  allergies?: string[];
  conditions?: PatientCondition[];
  currentMedications?: PatientMedication[];
  lastVisit?: Date;
  lastVisitReason?: string;
  recentVitals?: {
    bp?: VitalReading[];
    weight?: VitalReading[];
    hba1c?: VitalReading[];
  };
}

export interface PatientContextCardUIProps {
  patient: PatientContextData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  className?: string;
  showVitalsTrend?: boolean;
}

export function PatientContextCardUI({
  patient,
  isExpanded,
  onToggleExpand,
  className,
  showVitalsTrend = false,
}: PatientContextCardUIProps) {
  const hasAllergies = patient.allergies && patient.allergies.length > 0;
  const hasConditions = patient.conditions && patient.conditions.length > 0;
  const hasMedications =
    patient.currentMedications && patient.currentMedications.length > 0;

  return (
    <div
      className={cn(
        "border rounded-lg bg-card shadow-sm overflow-hidden",
        hasAllergies && "border-l-4 border-l-red-500",
        className,
      )}
    >
      {/* Header */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">
                  {patient.firstName} {patient.lastName}
                </h3>
                {patient.age && patient.gender && (
                  <span className="text-sm text-muted-foreground">
                    {patient.age}
                    {patient.gender === "male"
                      ? "M"
                      : patient.gender === "female"
                        ? "F"
                        : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {patient.bloodGroup && (
                  <span className="flex items-center gap-1">
                    <Droplets className="h-3 w-3" />
                    {patient.bloodGroup}
                  </span>
                )}
                {hasAllergies && (
                  <Badge variant="destructive" className="text-[10px] h-5">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Allergies
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Allergies banner */}
      {hasAllergies && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              Allergies: {patient.allergies!.join(", ")}
            </span>
          </div>
        </div>
      )}

      {/* Collapsible content */}
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleContent>
          <div className="p-3 space-y-4">
            {/* Active Problems */}
            {hasConditions && (
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                  <Clipboard className="h-3 w-3" />
                  Active Problems
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {patient.conditions!.map((condition, i) => (
                    <Badge
                      key={i}
                      variant={condition.isChronic ? "default" : "secondary"}
                      className="text-xs"
                    >
                      <Heart className="h-3 w-3 mr-1" />
                      {condition.name}
                      {condition.duration && (
                        <span className="ml-1 opacity-70">
                          ({condition.duration})
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Current Medications */}
            {hasMedications && (
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                  <Pill className="h-3 w-3" />
                  Current Medications
                </div>
                <div className="space-y-1">
                  {patient.currentMedications!.slice(0, 4).map((med, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm bg-muted/50 px-2 py-1 rounded"
                    >
                      <span className="font-medium">{med.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {med.dosage} • {med.frequency}
                      </span>
                    </div>
                  ))}
                  {patient.currentMedications!.length > 4 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-xs"
                    >
                      +{patient.currentMedications!.length - 4} more medications
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Vitals Trend */}
            {showVitalsTrend &&
              patient.recentVitals?.bp &&
              patient.recentVitals.bp.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                    <Activity className="h-3 w-3" />
                    Recent BP Readings
                  </div>
                  <div className="flex items-end gap-2 h-12">
                    {patient.recentVitals.bp.slice(-5).map((reading, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          className={cn(
                            "w-full rounded-t",
                            reading.isNormal ? "bg-green-500" : "bg-amber-500",
                          )}
                          style={{
                            height: `${Math.min(100, parseInt(reading.value.split("/")[0]) / 2)}%`,
                          }}
                        />
                        <span className="text-[9px] text-muted-foreground">
                          {format(reading.date, "d/M")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Last Visit */}
            {patient.lastVisit && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <History className="h-3 w-3" />
                    Last visit:{" "}
                    {formatDistanceToNow(patient.lastVisit, {
                      addSuffix: true,
                    })}
                  </div>
                  {patient.lastVisitReason && (
                    <span className="text-xs text-muted-foreground">
                      {patient.lastVisitReason}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
              >
                <Link href={`/patients/${patient.id}`}>
                  <FileText className="h-3 w-3 mr-1" />
                  Full History
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
              >
                <Link href={`/patients/${patient.id}/prescriptions`}>
                  <Pill className="h-3 w-3 mr-1" />
                  Prescriptions
                </Link>
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
