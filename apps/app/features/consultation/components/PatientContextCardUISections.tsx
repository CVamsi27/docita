"use client";

import Link from "next/link";
import { Activity, AlertTriangle, ChevronDown, ChevronUp, FileText, History, Pill, User } from "lucide-react";
import { Badge, Button, SymbolTooltip } from "@workspace/ui/components";
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

export interface PatientCardHeaderProps {
  patient: PatientContextData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  hasAllergies: boolean;
}

export function PatientCardHeader({
  patient,
  isExpanded,
  onToggleExpand,
  hasAllergies,
}: PatientCardHeaderProps) {
  return (
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
  );
}

export interface PatientAllergiesBannerProps {
  allergies: string[];
}

export function PatientAllergiesBanner({
  allergies,
}: PatientAllergiesBannerProps) {
  return (
    <div className="px-3 py-2 surface-danger border-b">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-sm font-medium">
          Allergies: {allergies.join(", ")}
        </span>
      </div>
    </div>
  );
}

export interface PatientConditionsSectionProps {
  conditions: PatientContextData["conditions"];
}

export function PatientConditionsSection({
  conditions,
}: PatientConditionsSectionProps) {
  return (
    <div className="px-4 py-2 border-b">
      <SummaryConditions
        conditions={(conditions || []).map((c) => ({
          id: c.name,
          name: c.name,
          status: c.isChronic ? "chronic" : "active" as const,
        }))}
      />
    </div>
  );
}

export interface PatientMedicationsSectionProps {
  medications: PatientContextData["currentMedications"];
}

export function PatientMedicationsSection({
  medications,
}: PatientMedicationsSectionProps) {
  return (
    <div className="px-4 py-2 border-b">
      <SummaryMedications
        medications={(medications || []).map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
        }))}
      />
    </div>
  );
}

export interface PatientVitalsSectionProps {
  recentVitals: PatientContextData["recentVitals"];
}

export function PatientVitalsSection({
  recentVitals,
}: PatientVitalsSectionProps) {
  return (
    <div className="px-4 py-2 border-b">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4" />
          Key Vitals (Last 3 visits)
        </div>

        {recentVitals?.bp && recentVitals.bp.length > 0 && (
          <div className="bg-muted/50 p-2 rounded text-xs space-y-1">
            <div className="flex justify-between font-medium">
              <span>Blood pressure</span>
              <span>{recentVitals.bp[0].value}</span>
            </div>
            <div className="text-muted-foreground flex justify-between text-[var(--fs-2xs)]">
              <span>Previous:</span>
              <span>
                {recentVitals.bp.slice(1).map((b) => b.value).join(", ")}
              </span>
            </div>
          </div>
        )}

        {recentVitals?.weight && recentVitals.weight.length > 0 && (
          <div className="bg-muted/50 p-2 rounded text-xs space-y-1">
            <div className="flex justify-between font-medium">
              <span>Weight</span>
              <span>{recentVitals.weight[0].value}</span>
            </div>
            <div className="text-muted-foreground flex justify-between text-[var(--fs-2xs)]">
              <span>Previous:</span>
              <span>
                {recentVitals.weight.slice(1).map((b) => b.value).join(", ")}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export interface PatientLastVisitSectionProps {
  lastVisit: Date;
  lastVisitReason?: string;
}

export function PatientLastVisitSection({
  lastVisit,
  lastVisitReason,
}: PatientLastVisitSectionProps) {
  return (
    <div className="pt-2 border-t">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <History className="h-3 w-3" />
          Last visit: {formatDistanceToNow(lastVisit)}
        </div>
        {lastVisitReason && (
          <span className="text-xs text-muted-foreground">
            {lastVisitReason}
          </span>
        )}
      </div>
    </div>
  );
}

export interface PatientCardActionsProps {
  patientId: string;
}

export function PatientCardActions({ patientId }: PatientCardActionsProps) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Button
        asChild
        variant="outline"
        size="sm"
        className="flex-1 h-8 text-xs"
      >
        <Link href={`/patients/${patientId}?tab=visits`}>
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
          href={`/patients/${patientId}?tab=records&subtab=prescriptions`}
        >
          <Pill className="h-3 w-3 mr-1" />
          Prescriptions
        </Link>
      </Button>
    </div>
  );
}
