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
import { SummaryVitals } from "./shared/SummaryVitals";
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
            {/* Use shared SummaryConditions - map PatientCondition to required format */}
            <div className="px-4 py-2 border-b">
              <SummaryConditions
                conditions={(patient.conditions || []).map((c) => ({
                  id: c.name,
                  name: c.name,
                  status: c.isChronic ? "chronic" : "active",
                }))}
              />
            </div>

            {/* Use shared SummaryMedications - map PatientMedication to required format */}
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
              {/* Map recent vitals to SummaryVitals format. 
               This part is tricky because PatientContextCard has specialized trend view which SummaryVitals doesn't support yet.
               However, I can use SummaryVitals for the 'latest' view if I had it.
               The context card shows specific vitals like BP, Weight, HbA1c with history/trend sparklines (in advanced version) or just list.
               The original code had lists of readings.
               SummaryVitals is for a snapshot.
               So, for now, I will NOT force simple SummaryVitals here if it loses functionality (like history).
               But looking at the outline, it seemed to just list them.
               Let's stick to the outline content I saw earlier?
               Wait, outline 783 showed "recentVitals?: { bp?: VitalReading[]; ... }".
               It seems ContextCard is more advanced.
               I should arguably NOT replace it with the simple snapshot component unless I upgrade the snapshot component.
               
               DECISION: Skip replacing ContextCard sections with the simple Summary components to avoid feature regression.
               ContextCard is distinct in its purpose (sidebar history vs dashboard snapshot).
               I will only remove the unused imports I added if I decide against it?
               Actually, I already extracted SummaryConditions and Medications. Those are lists and safe to use.
               Vitals... ContextCard likely shows trends.
               I'll revert the Vitals part of this plan for ContextCard but keep Conditions/Meds.
           */}

              {/* Original Vitals Section Logic Key: 'recentVitals' */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Activity className="h-4 w-4" />
                  Key Vitals (Last 3 visits)
                </div>

                {/* BP Trend */}
                {patient.recentVitals?.bp &&
                  patient.recentVitals.bp.length > 0 && (
                    <div className="bg-muted/50 p-2 rounded text-xs space-y-1">
                      <div className="flex justify-between font-medium">
                        <span>Blood Pressure</span>
                        <span>{patient.recentVitals.bp[0].value}</span>
                      </div>
                      <div className="text-muted-foreground flex justify-between text-[10px]">
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

                {/* Weight Trend */}
                {patient.recentVitals?.weight &&
                  patient.recentVitals.weight.length > 0 && (
                    <div className="bg-muted/50 p-2 rounded text-xs space-y-1">
                      <div className="flex justify-between font-medium">
                        <span>Weight</span>
                        <span>{patient.recentVitals.weight[0].value}</span>
                      </div>
                      <div className="text-muted-foreground flex justify-between text-[10px]">
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
