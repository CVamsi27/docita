"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Droplets,
  FileText,
  History,
  Pill,
  User,
} from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Collapsible,
  CollapsibleContent,
} from "@workspace/ui/components/overlay/collapsible";
import { cn } from "@workspace/ui/lib/utils";
import { formatDistanceToNow, getPatientFullName } from "@workspace/utils";
import { SummaryMedications } from "./shared/SummaryMedications";
import { SummaryConditions } from "./shared/SummaryConditions";

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
}: PatientContextCardUIProps) {
  const hasAllergies = patient.allergies && patient.allergies.length > 0;

  return (
    <div
      className={cn(
        "border border-border/70 rounded-[var(--radius)] bg-card shadow-sm overflow-hidden",
        hasAllergies && "border-l-4 border-l-red-500",
        className,
      )}
    >
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{getPatientFullName(patient)}</h3>
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
                  <Badge
                    variant="destructive"
                    className="text-[var(--fs-2xs)] h-5"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Allergies
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <SymbolTooltip
            label={
              isExpanded ? "Collapse patient summary" : "Expand patient summary"
            }
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleExpand}
              aria-label={
                isExpanded
                  ? "Collapse patient summary"
                  : "Expand patient summary"
              }
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </SymbolTooltip>
        </div>
      </div>

      {hasAllergies && (
        <div className="px-3 py-2 surface-danger border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm font-medium">
              Allergies: {(patient.allergies ?? []).join(", ")}
            </span>
          </div>
        </div>
      )}

      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleContent>
          <div className="p-3 space-y-4">
            <div className="px-4 py-2 border-b">
              <SummaryConditions
                conditions={(patient.conditions || []).map((c) => ({
                  id: c.name,
                  name: c.name,
                  status: c.isChronic ? "chronic" : "active",
                }))}
              />
            </div>

            <div className="px-4 py-2 border-b">
              <SummaryMedications
                medications={(patient.currentMedications || []).map((m) => ({
                  name: m.name,
                  dosage: m.dosage,
                  frequency: m.frequency,
                }))}
              />
            </div>

            <div className="px-4 py-2 border-b">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Activity className="h-4 w-4" />
                  Key Vitals (Last 3 visits)
                </div>

                {patient.recentVitals?.bp &&
                  patient.recentVitals.bp.length > 0 && (
                    <div className="bg-muted/50 p-2 rounded text-xs space-y-1">
                      <div className="flex justify-between font-medium">
                        <span>Blood pressure</span>
                        <span>{patient.recentVitals.bp[0].value}</span>
                      </div>
                      <div className="text-muted-foreground flex justify-between text-[var(--fs-2xs)]">
                        <span>Previous:</span>
                        <span>
                          {patient.recentVitals.bp
                            .slice(1)
                            .map((b) => b.value)
                            .join(", ")}
                        </span>
                      </div>
                    </div>
                  )}

                {patient.recentVitals?.weight &&
                  patient.recentVitals.weight.length > 0 && (
                    <div className="bg-muted/50 p-2 rounded text-xs space-y-1">
                      <div className="flex justify-between font-medium">
                        <span>Weight</span>
                        <span>{patient.recentVitals.weight[0].value}</span>
                      </div>
                      <div className="text-muted-foreground flex justify-between text-[var(--fs-2xs)]">
                        <span>Previous:</span>
                        <span>
                          {patient.recentVitals.weight
                            .slice(1)
                            .map((b) => b.value)
                            .join(", ")}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            </div>
            {patient.lastVisit && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <History className="h-3 w-3" />
                    Last visit: {formatDistanceToNow(patient.lastVisit)}
                  </div>
                  {patient.lastVisitReason && (
                    <span className="text-xs text-muted-foreground">
                      {patient.lastVisitReason}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
              >
                <Link href={`/patients/${patient.id}?tab=visits`}>
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
                <Link
                  href={`/patients/${patient.id}?tab=records&subtab=prescriptions`}
                >
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
