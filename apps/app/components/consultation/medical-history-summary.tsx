"use client";

/**
 * MedicalHistorySummary Component
 *
 * @description Compact, collapsible medical history summary optimized for clinical consultation.
 * Designed for quick reference and space-constrained views like sidebars and dashboards.
 *
 * @use-cases
 * - Clinical Documentation Sidebar (quick reference during consultation)
 * - Consultation View Sidebar (non-intrusive, expandable)
 * - Dashboard Quick View (space-efficient summary)
 * - Patient Summary Cards
 *
 * @features
 * - Three display variants: 'full' | 'compact' | 'sidebar'
 * - Collapsible sections
 * - Highlights critical information (allergies, active conditions)
 * - Vital trends visualization
 * - Past diagnoses summary
 * - Current medications display
 * - Backward compatibility with legacy string fields
 *
 * @props
 * - patientId: string - Patient identifier
 * - medicalConditions: PatientMedicalCondition[] - Structured conditions
 * - allergies: PatientAllergy[] - Patient allergies
 * - familyHistory: PatientFamilyHistory[] - Family medical history
 * - socialHistory: PatientSocialHistory - Social determinants
 * - surgicalHistory: PatientSurgicalHistory[] - Past surgeries
 * - legacyMedicalHistory: string[] - Legacy text format (backward compatibility)
 * - legacyAllergies: string - Legacy text format (backward compatibility)
 * - variant: 'full' | 'compact' | 'sidebar' - Display mode (default: 'full')
 * - showExpandButton: boolean - Show expand/collapse controls
 * - defaultExpanded: boolean - Initial expansion state
 *
 * @variants
 * - 'full': Complete detailed view with all sections expanded
 * - 'compact': Condensed view showing only critical information
 * - 'sidebar': Space-efficient sidebar optimized layout
 *
 * @example
 * // Clinical consultation sidebar
 * <MedicalHistorySummary
 *   patientId={patient.id}
 *   medicalConditions={patient.medicalConditions}
 *   allergies={patient.allergies}
 *   variant="sidebar"
 *   showExpandButton={true}
 *   defaultExpanded={false}
 * />
 *
 * // Dashboard compact view
 * <MedicalHistorySummary
 *   patientId={patient.id}
 *   medicalConditions={patient.medicalConditions}
 *   variant="compact"
 * />
 *
 * @see PatientMedicalHistory for full editing interface
 */

import * as React from "react";
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
  ChevronDown,
  ChevronRight,
  Cigarette,
  Heart,
  Minus,
  Pill,
  Scissors,
  Shield,
  ShieldAlert,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
  Wine,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";

// ============================================================================
// Local Type Definitions (matching Prisma schema)
// ============================================================================

export type MedicalConditionType =
  | "CHRONIC"
  | "ACUTE"
  | "CONGENITAL"
  | "INFECTIOUS"
  | "AUTOIMMUNE"
  | "PSYCHIATRIC"
  | "OTHER";

export type ConditionStatus =
  | "ACTIVE"
  | "MANAGED"
  | "RESOLVED"
  | "IN_REMISSION";

export type ConditionSeverity = "MILD" | "MODERATE" | "SEVERE" | "CRITICAL";

export type ConditionSourceType = "MANUAL" | "AUTO_SUGGESTED" | "IMPORTED";

export type AllergyType =
  | "DRUG"
  | "FOOD"
  | "ENVIRONMENTAL"
  | "LATEX"
  | "INSECT"
  | "CONTRAST"
  | "OTHER";

export type AllergySeverity =
  | "MILD"
  | "MODERATE"
  | "SEVERE"
  | "LIFE_THREATENING";

export type SmokingStatus = "NEVER" | "FORMER" | "CURRENT" | "UNKNOWN";

export type AlcoholUseStatus =
  | "NONE"
  | "OCCASIONAL"
  | "MODERATE"
  | "HEAVY"
  | "UNKNOWN";

export interface PatientMedicalCondition {
  id?: string;
  patientId: string;
  conditionName: string;
  icdCode?: string;
  conditionType: MedicalConditionType;
  status: ConditionStatus;
  severity?: ConditionSeverity;
  diagnosedDate?: string | Date;
  resolvedDate?: string | Date;
  diagnosedBy?: string;
  notes?: string;
  sourceType: ConditionSourceType;
  sourceAppointmentId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface PatientAllergy {
  id?: string;
  patientId: string;
  allergen: string;
  allergyType: AllergyType;
  severity: AllergySeverity;
  reaction?: string;
  onsetDate?: string | Date;
  verifiedBy?: string;
  verifiedAt?: string | Date;
  isVerified: boolean;
  notes?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface PatientFamilyHistory {
  id?: string;
  patientId: string;
  condition: string;
  relationship: string;
  ageAtOnset?: number;
  notes?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface PatientSocialHistory {
  id?: string;
  patientId: string;
  smokingStatus?: SmokingStatus;
  smokingPackYears?: number;
  smokingQuitDate?: string | Date;
  alcoholUse?: AlcoholUseStatus;
  alcoholFrequency?: string;
  substanceUse?: string;
  occupation?: string;
  occupationalHazards?: string;
  exerciseFrequency?: string;
  dietaryRestrictions?: string;
  notes?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface PatientSurgicalHistory {
  id?: string;
  patientId: string;
  procedureName: string;
  procedureDate?: string | Date;
  hospital?: string;
  surgeon?: string;
  complications?: string;
  notes?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// ============================================================================
// Component Types
// ============================================================================

interface CurrentMedication {
  name: string;
  dosage: string;
  frequency: string;
  startDate?: Date | string;
  prescribedFor?: string;
}

interface VitalTrend {
  type: "BP" | "Pulse" | "Temp" | "SpO2" | "Weight";
  current: string;
  previous?: string;
  trend: "up" | "down" | "stable";
  status: "normal" | "elevated" | "low" | "critical";
  date: Date | string;
}

interface PastDiagnosis {
  id: string;
  code: string;
  description: string;
  date: Date | string;
  count?: number; // Number of times this diagnosis appears
}

interface MedicalHistorySummaryProps {
  // Patient basic info
  patientId: string;

  // Structured medical history (new format)
  medicalConditions?: PatientMedicalCondition[];
  allergies?: PatientAllergy[];
  familyHistory?: PatientFamilyHistory[];
  socialHistory?: PatientSocialHistory | null;
  surgicalHistory?: PatientSurgicalHistory[];

  // Legacy format (for backward compatibility)
  legacyMedicalHistory?: string[];
  legacyAllergies?: string;

  // Current state
  currentMedications?: CurrentMedication[];
  vitalTrends?: VitalTrend[];
  pastDiagnoses?: PastDiagnosis[];

  // UI options
  variant?: "full" | "compact" | "sidebar";
  showExpandButton?: boolean;
  defaultExpanded?: boolean;
  className?: string;

  // Callbacks
  onAddCondition?: () => void;
  onAddAllergy?: () => void;
  onViewFullHistory?: () => void;
}

// ============================================================================
// Helper Components
// ============================================================================

const ALLERGY_SEVERITY_CONFIG: Record<
  AllergySeverity,
  { color: string; icon: typeof Shield; priority: number }
> = {
  LIFE_THREATENING: {
    color: "bg-red-200 text-red-900 border-red-500",
    icon: ShieldAlert,
    priority: 1,
  },
  SEVERE: {
    color: "bg-red-100 text-red-800 border-red-300",
    icon: ShieldAlert,
    priority: 2,
  },
  MODERATE: {
    color: "bg-orange-100 text-orange-800 border-orange-300",
    icon: AlertTriangle,
    priority: 3,
  },
  MILD: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    icon: Shield,
    priority: 4,
  },
};

const CONDITION_STATUS_CONFIG: Record<
  ConditionStatus,
  { color: string; label: string }
> = {
  ACTIVE: { color: "destructive", label: "Active" },
  MANAGED: { color: "secondary", label: "Managed" },
  RESOLVED: { color: "outline", label: "Resolved" },
  IN_REMISSION: { color: "default", label: "In Remission" },
};

const VITAL_STATUS_COLORS = {
  normal: "text-green-600",
  elevated: "text-orange-600",
  low: "text-blue-600",
  critical: "text-red-600 font-bold",
};

const TREND_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

// Allergy Alert Banner - Critical allergies should always be visible
function AllergyAlertBanner({ allergies }: { allergies: PatientAllergy[] }) {
  const sortedAllergies = [...allergies].sort(
    (a, b) =>
      ALLERGY_SEVERITY_CONFIG[a.severity].priority -
      ALLERGY_SEVERITY_CONFIG[b.severity].priority,
  );

  const criticalAllergies = sortedAllergies.filter(
    (a) => a.severity === "LIFE_THREATENING" || a.severity === "SEVERE",
  );
  const otherAllergies = sortedAllergies.filter(
    (a) => a.severity !== "LIFE_THREATENING" && a.severity !== "SEVERE",
  );

  if (allergies.length === 0) return null;

  const hasCritical = criticalAllergies.length > 0;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-lg border-2",
        hasCritical
          ? "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800"
          : "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/30 dark:border-yellow-800",
      )}
    >
      <ShieldAlert
        className={cn(
          "h-5 w-5 mt-0.5 shrink-0",
          hasCritical ? "text-red-600 animate-pulse" : "text-yellow-600",
        )}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-semibold mb-1",
            hasCritical
              ? "text-red-800 dark:text-red-200"
              : "text-yellow-800 dark:text-yellow-200",
          )}
        >
          {hasCritical ? "⚠ CRITICAL ALLERGIES" : "Known Allergies"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {criticalAllergies.map((allergy) => (
            <TooltipProvider key={allergy.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-medium cursor-help",
                      ALLERGY_SEVERITY_CONFIG[allergy.severity].color,
                      allergy.severity === "LIFE_THREATENING" &&
                        "animate-pulse",
                    )}
                  >
                    {allergy.allergen}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-semibold">{allergy.allergen}</p>
                    <p className="text-xs">Type: {allergy.allergyType}</p>
                    <p className="text-xs">
                      Severity: {allergy.severity.replace("_", " ")}
                    </p>
                    {allergy.reaction && (
                      <p className="text-xs">Reaction: {allergy.reaction}</p>
                    )}
                    {allergy.isVerified && (
                      <p className="text-xs text-green-600">✓ Verified</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          {otherAllergies.map((allergy) => (
            <TooltipProvider key={allergy.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs cursor-help",
                      ALLERGY_SEVERITY_CONFIG[allergy.severity].color,
                    )}
                  >
                    {allergy.allergen}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs capitalize">
                    {allergy.severity.toLowerCase()} - {allergy.allergyType}
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
    </div>
  );
}

// Legacy allergy display for backward compatibility
function LegacyAllergyBanner({ allergiesString }: { allergiesString: string }) {
  const allergies = allergiesString
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  if (allergies.length === 0) return null;

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg border-2 bg-yellow-50 border-yellow-300 dark:bg-yellow-950/30 dark:border-yellow-800">
      <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-yellow-600" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
          Known Allergies
        </p>
        <div className="flex flex-wrap gap-1.5">
          {allergies.map((allergy, index) => (
            <Badge
              key={index}
              variant="outline"
              className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300"
            >
              {allergy}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// Active Conditions Section
function ActiveConditionsSection({
  conditions,
}: {
  conditions: PatientMedicalCondition[];
}) {
  const activeConditions = conditions.filter(
    (c) => c.status === "ACTIVE" || c.status === "MANAGED",
  );

  if (activeConditions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Heart className="h-3.5 w-3.5 text-red-500" />
        Active Conditions ({activeConditions.length})
      </div>
      <div className="space-y-1.5">
        {activeConditions.map((condition) => (
          <div
            key={condition.id}
            className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/50 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {condition.conditionName}
              </p>
              {condition.icdCode && (
                <p className="text-xs text-muted-foreground">
                  {condition.icdCode}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {condition.severity && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    condition.severity === "CRITICAL" &&
                      "bg-red-100 text-red-800 border-red-300",
                    condition.severity === "SEVERE" &&
                      "bg-orange-100 text-orange-800 border-orange-300",
                    condition.severity === "MODERATE" &&
                      "bg-yellow-100 text-yellow-800 border-yellow-300",
                    condition.severity === "MILD" &&
                      "bg-green-100 text-green-800 border-green-300",
                  )}
                >
                  {condition.severity}
                </Badge>
              )}
              <Badge
                variant={
                  CONDITION_STATUS_CONFIG[condition.status].color as
                    | "destructive"
                    | "secondary"
                    | "outline"
                    | "default"
                }
                className="text-[10px] px-1.5 py-0"
              >
                {CONDITION_STATUS_CONFIG[condition.status].label}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Current Medications Section
function CurrentMedicationsSection({
  medications,
}: {
  medications: CurrentMedication[];
}) {
  if (medications.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Pill className="h-3.5 w-3.5 text-blue-500" />
        Current Medications ({medications.length})
      </div>
      <div className="space-y-1">
        {medications.slice(0, 5).map((med, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded text-sm"
          >
            <span className="font-medium">{med.name}</span>
            <span className="text-muted-foreground text-xs">
              {med.dosage} • {med.frequency}
            </span>
          </div>
        ))}
        {medications.length > 5 && (
          <p className="text-xs text-muted-foreground px-3">
            +{medications.length - 5} more medications
          </p>
        )}
      </div>
    </div>
  );
}

// Vital Trends Section
function VitalTrendsSection({ vitals }: { vitals: VitalTrend[] }) {
  if (vitals.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Activity className="h-3.5 w-3.5 text-green-500" />
        Recent Vitals
      </div>
      <div className="grid grid-cols-2 gap-2">
        {vitals.map((vital, index) => {
          const TrendIcon = TREND_ICONS[vital.trend];
          return (
            <div
              key={index}
              className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded"
            >
              <div>
                <p className="text-xs text-muted-foreground">{vital.type}</p>
                <p
                  className={cn(
                    "text-sm font-medium",
                    VITAL_STATUS_COLORS[vital.status],
                  )}
                >
                  {vital.current}
                </p>
              </div>
              <TrendIcon
                className={cn(
                  "h-4 w-4",
                  vital.trend === "up" &&
                    vital.status !== "normal" &&
                    "text-orange-500",
                  vital.trend === "down" &&
                    vital.status !== "normal" &&
                    "text-blue-500",
                  vital.trend === "stable" && "text-gray-400",
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Past Diagnoses Section with frequency
function PastDiagnosesSection({ diagnoses }: { diagnoses: PastDiagnosis[] }) {
  if (diagnoses.length === 0) return null;

  // Group by frequency
  const sortedDiagnoses = [...diagnoses].sort(
    (a, b) => (b.count || 1) - (a.count || 1),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Stethoscope className="h-3.5 w-3.5 text-purple-500" />
        Past Diagnoses
      </div>
      <div className="space-y-1">
        {sortedDiagnoses.slice(0, 5).map((diagnosis) => (
          <div
            key={diagnosis.id}
            className="flex items-center justify-between px-3 py-1.5 bg-muted/30 rounded text-sm"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium">{diagnosis.description}</span>
              <span className="text-muted-foreground text-xs ml-2">
                ({diagnosis.code})
              </span>
            </div>
            {diagnosis.count && diagnosis.count > 1 && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 ml-2"
              >
                ×{diagnosis.count}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Surgical History Section
function SurgicalHistorySection({
  surgeries,
}: {
  surgeries: PatientSurgicalHistory[];
}) {
  if (surgeries.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Scissors className="h-3.5 w-3.5 text-gray-500" />
        Surgical History
      </div>
      <div className="space-y-1">
        {surgeries.map((surgery) => (
          <div
            key={surgery.id}
            className="flex items-center justify-between px-3 py-1.5 bg-muted/30 rounded text-sm"
          >
            <span className="font-medium">{surgery.procedureName}</span>
            {surgery.procedureDate && (
              <span className="text-muted-foreground text-xs">
                {format(new Date(surgery.procedureDate), "MMM yyyy")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Family History Section
function FamilyHistorySection({
  history,
}: {
  history: PatientFamilyHistory[];
}) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Users className="h-3.5 w-3.5 text-indigo-500" />
        Family History
      </div>
      <div className="flex flex-wrap gap-1.5">
        {history.map((item) => (
          <TooltipProvider key={item.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs cursor-help">
                  {item.condition} ({item.relationship})
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {item.ageAtOnset && (
                  <p className="text-xs">Age at onset: {item.ageAtOnset}</p>
                )}
                {item.notes && <p className="text-xs">{item.notes}</p>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}

// Social History Section
function SocialHistorySection({ history }: { history: PatientSocialHistory }) {
  const hasData =
    history.smokingStatus || history.alcoholUse || history.occupation;
  if (!hasData) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Social History
      </div>
      <div className="flex flex-wrap gap-2">
        {history.smokingStatus && history.smokingStatus !== "UNKNOWN" && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 rounded text-xs">
            <Cigarette className="h-3 w-3" />
            <span>
              {history.smokingStatus === "CURRENT" && "Current Smoker"}
              {history.smokingStatus === "FORMER" && "Former Smoker"}
              {history.smokingStatus === "NEVER" && "Non-Smoker"}
            </span>
          </div>
        )}
        {history.alcoholUse && history.alcoholUse !== "UNKNOWN" && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 rounded text-xs">
            <Wine className="h-3 w-3" />
            <span className="capitalize">
              {history.alcoholUse.toLowerCase()} alcohol use
            </span>
          </div>
        )}
        {history.occupation && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 rounded text-xs">
            <span>Occupation: {history.occupation}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MedicalHistorySummary({
  patientId,
  medicalConditions = [],
  allergies = [],
  familyHistory = [],
  socialHistory,
  surgicalHistory = [],
  legacyMedicalHistory = [],
  legacyAllergies,
  currentMedications = [],
  vitalTrends = [],
  pastDiagnoses = [],
  variant = "full",
  showExpandButton = true,
  defaultExpanded = false,
  className,
  onAddCondition,
  onAddAllergy,
  onViewFullHistory,
}: MedicalHistorySummaryProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  // Use structured allergies if available, otherwise fall back to legacy
  const hasStructuredAllergies = allergies.length > 0;
  const hasLegacyAllergies =
    legacyAllergies && legacyAllergies.trim().length > 0;

  // Combine structured and legacy conditions for display
  const allConditions = [
    ...medicalConditions,
    ...legacyMedicalHistory.map((item, index) => ({
      id: `legacy-${index}`,
      patientId,
      conditionName: item,
      conditionType: "CHRONIC" as const,
      status: "ACTIVE" as const,
      sourceType: "MANUAL" as const,
    })),
  ];

  const isCompact = variant === "compact";
  const hasDetailedHistory =
    familyHistory.length > 0 ||
    socialHistory ||
    surgicalHistory.length > 0 ||
    pastDiagnoses.length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Allergy Alert - Always visible at top */}
      {hasStructuredAllergies && <AllergyAlertBanner allergies={allergies} />}
      {!hasStructuredAllergies && hasLegacyAllergies && (
        <LegacyAllergyBanner allergiesString={legacyAllergies} />
      )}

      {/* Active Conditions - Always visible */}
      {allConditions.length > 0 && (
        <ActiveConditionsSection
          conditions={allConditions as PatientMedicalCondition[]}
        />
      )}

      {/* Current Medications - Always visible */}
      {currentMedications.length > 0 && (
        <CurrentMedicationsSection medications={currentMedications} />
      )}

      {/* Vital Trends - Always visible in full mode */}
      {!isCompact && vitalTrends.length > 0 && (
        <VitalTrendsSection vitals={vitalTrends} />
      )}

      {/* Expandable sections for detailed history */}
      {showExpandButton && hasDetailedHistory && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Hide Detailed History
              </>
            ) : (
              <>
                <ChevronRight className="h-3 w-3 mr-1" />
                View Detailed History
              </>
            )}
          </Button>

          {isExpanded && (
            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Past Diagnoses */}
              {pastDiagnoses.length > 0 && (
                <PastDiagnosesSection diagnoses={pastDiagnoses} />
              )}

              {/* Surgical History */}
              {surgicalHistory.length > 0 && (
                <SurgicalHistorySection surgeries={surgicalHistory} />
              )}

              {/* Family History */}
              {familyHistory.length > 0 && (
                <FamilyHistorySection history={familyHistory} />
              )}

              {/* Social History */}
              {socialHistory && (
                <SocialHistorySection history={socialHistory} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons for adding data */}
      {(onAddCondition || onAddAllergy) && !isCompact && (
        <div className="flex gap-2 pt-2 border-t">
          {onAddCondition && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddCondition}
              className="text-xs"
            >
              + Add Condition
            </Button>
          )}
          {onAddAllergy && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddAllergy}
              className="text-xs"
            >
              + Add Allergy
            </Button>
          )}
        </div>
      )}

      {/* View full history link */}
      {onViewFullHistory && (
        <Button
          variant="link"
          size="sm"
          onClick={onViewFullHistory}
          className="w-full text-xs text-muted-foreground"
        >
          View Complete Medical Record →
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Compact Allergy Alert for use at top of consultation
// ============================================================================

export function CompactAllergyAlert({
  allergies,
  legacyAllergies,
  className,
}: {
  allergies?: PatientAllergy[];
  legacyAllergies?: string;
  className?: string;
}) {
  const hasStructured = allergies && allergies.length > 0;
  const hasLegacy = legacyAllergies && legacyAllergies.trim().length > 0;

  if (!hasStructured && !hasLegacy) return null;

  if (hasStructured) {
    const criticalCount = allergies.filter(
      (a) => a.severity === "LIFE_THREATENING" || a.severity === "SEVERE",
    ).length;

    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs",
          criticalCount > 0
            ? "bg-red-100 text-red-800 border border-red-300"
            : "bg-yellow-100 text-yellow-800 border border-yellow-300",
          className,
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="font-medium">
          {allergies.length} known{" "}
          {allergies.length === 1 ? "allergy" : "allergies"}
          {criticalCount > 0 && ` (${criticalCount} critical)`}
        </span>
      </div>
    );
  }

  // Legacy format
  const allergyList = legacyAllergies!
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs bg-yellow-100 text-yellow-800 border border-yellow-300",
        className,
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      <span className="font-medium">Allergies: {allergyList.join(", ")}</span>
    </div>
  );
}
