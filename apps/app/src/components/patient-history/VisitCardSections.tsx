import type { ElementType } from "react";
import { Link } from "react-router";
import { Badge, Button, SymbolTooltip } from "@workspace/ui/components";
import { ChevronDown, ChevronUp, Pill } from "lucide-react";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { cn } from "@workspace/ui/lib/utils";
import { VisitCardMedicationList } from "./visit-card-medication-list";
import { medicationSummaryLine } from "./visit-card-config";
import type { VitalsMetadata, DiagnosisMetadata, MedicationMetadata } from "./visit-card-config";

export type VisitCardAction = {
  label: string;
  href?: string;
  variant: "default" | "outline";
  disabled: boolean;
};

function ActionButton({ action }: { action: VisitCardAction }) {
  if (action.href) {
    return (
      <Button asChild size="sm" variant={action.variant} className="h-9 px-3 text-xs font-medium" onClick={(e) => e.stopPropagation()}>
        <Link to={action.href}>{action.label}</Link>
      </Button>
    );
  }
  return (
    <Button size="sm" variant={action.variant} className="h-9 px-3 text-xs font-medium" disabled={action.disabled} onClick={(e) => e.stopPropagation()}>
      {action.label}
    </Button>
  );
}

// ── Compact timeline dot variant ──────────────────────────────────────────────

export function CompactVisitCard({
  icon: Icon,
  color,
  displayTitle,
  dateStr,
  isAppointment,
  medications,
  displayPrimaryDiagnosis,
  doctorName,
}: {
  icon: ElementType;
  color: string;
  displayTitle: string;
  dateStr: string;
  isAppointment: boolean;
  medications: MedicationMetadata[];
  displayPrimaryDiagnosis: string;
  doctorName: string | null | undefined;
}) {
  const medLine = medicationSummaryLine(medications);
  const summaryParts = [displayPrimaryDiagnosis, medLine].filter((s): s is string => Boolean(s && s.trim()));

  return (
    <div className="relative pl-6 pb-4 last:pb-0">
      <div className="absolute left-0 top-1 h-4 w-4 rounded-full border bg-muted flex items-center justify-center">
        <Icon className={cn("h-2.5 w-2.5", color)} />
      </div>
      <div className="flex items-start justify-between gap-1">
        <SymbolTooltip label={displayTitle}>
          <p className="text-xs font-medium truncate leading-tight">{displayTitle}</p>
        </SymbolTooltip>
        <span className="text-[var(--fs-2xs)] text-muted-foreground shrink-0">{dateStr}</span>
      </div>
      {isAppointment &&
        (summaryParts.length > 0 ? (
          <p className="text-[var(--fs-2xs)] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
            {summaryParts.join(" · ")}
          </p>
        ) : doctorName ? (
          <p className="text-[var(--fs-2xs)] text-muted-foreground mt-0.5 truncate">Dr. {doctorName}</p>
        ) : null)}
    </div>
  );
}

// ── Card header (title + actions + badges) ────────────────────────────────────

export function VisitCardHeader({
  displayTitle,
  dateStr,
  canExpand,
  expanded,
  mainAction,
  consultationAction,
  typeLabel,
  statusBadge,
  medicationsCount,
  doctorName,
  displayPrimaryDiagnosis,
}: {
  displayTitle: string;
  dateStr: string;
  canExpand: boolean;
  expanded: boolean;
  mainAction: VisitCardAction | null;
  consultationAction: VisitCardAction | null;
  typeLabel: string;
  statusBadge: string | null | undefined;
  medicationsCount: number;
  doctorName: string | null | undefined;
  displayPrimaryDiagnosis: string;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium truncate text-sm">{displayTitle}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {mainAction && <ActionButton action={mainAction} />}
          {consultationAction && <ActionButton action={consultationAction} />}
          <span className="text-xs text-muted-foreground">{dateStr}</span>
          {canExpand &&
            (expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-1">
        <Badge variant="outline" className="text-xs h-4 px-1.5">
          {typeLabel}
        </Badge>
        {statusBadge && (
          <Badge variant="secondary" className="text-xs h-4 px-1.5">
            {humanizeUiLabel(statusBadge)}
          </Badge>
        )}
        {medicationsCount > 0 && (
          <Badge variant="secondary" className="badge-success gap-1 text-xs h-4 px-1.5">
            <Pill className="h-2.5 w-2.5" aria-hidden />
            {medicationsCount} Rx
          </Badge>
        )}
        {doctorName && <span className="text-xs text-muted-foreground">Dr. {doctorName}</span>}
        {displayPrimaryDiagnosis && (
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            &middot; {displayPrimaryDiagnosis}
          </span>
        )}
      </div>
    </>
  );
}

// ── Vitals expanded section ───────────────────────────────────────────────────

export function VisitCardVitalsSection({ vitals }: { vitals: VitalsMetadata | null | undefined }) {
  if (!vitals || !Object.values(vitals).some(Boolean)) return null;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">Vitals</p>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
        {vitals.bp && (
          <span className="text-xs">
            <span className="text-muted-foreground">BP: </span>
            {vitals.bp} mmHg
          </span>
        )}
        {vitals.pulse && (
          <span className="text-xs">
            <span className="text-muted-foreground">HR: </span>
            {vitals.pulse} bpm
          </span>
        )}
        {vitals.temp && (
          <span className="text-xs">
            <span className="text-muted-foreground">Temp: </span>
            {vitals.temp}&deg;C
          </span>
        )}
        {vitals.spo2 && (
          <span className="text-xs">
            <span className="text-muted-foreground">SpO2: </span>
            {vitals.spo2}%
          </span>
        )}
        {vitals.weight && (
          <span className="text-xs">
            <span className="text-muted-foreground">Weight: </span>
            {vitals.weight} kg
          </span>
        )}
        {vitals.height && (
          <span className="text-xs">
            <span className="text-muted-foreground">Height: </span>
            {vitals.height} cm
          </span>
        )}
      </div>
    </div>
  );
}

// ── Diagnosis expanded section ────────────────────────────────────────────────

export function VisitCardDiagnosisSection({
  diagnoses,
  mode,
}: {
  diagnoses: DiagnosisMetadata[];
  mode: "full" | "compact" | "portal";
}) {
  if (!diagnoses.length) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">Diagnoses</p>
      <div className="flex flex-wrap gap-1.5">
        {diagnoses.slice(0, mode === "full" ? 5 : 2).map((d, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-xs">
            {d.description || d.code}
            {d.isPrimary && <span className="text-[10px] font-semibold text-primary">PRIMARY</span>}
          </span>
        ))}
        {diagnoses.length > 5 && mode === "full" && (
          <span className="text-xs text-muted-foreground">+{diagnoses.length - 5} more</span>
        )}
      </div>
    </div>
  );
}

// ── Medications expanded section ──────────────────────────────────────────────

export function VisitCardMedicationsSection({
  medications,
}: {
  medications: MedicationMetadata[];
}) {
  if (!medications.length) return null;
  return <VisitCardMedicationList medications={medications.slice(0, 5)} />;
}

// ── Treatment plan / observations expanded section ───────────────────────────

export function VisitCardProceduresSection({
  treatmentPlan,
  observations,
}: {
  treatmentPlan: string | null | undefined;
  observations: string | null | undefined;
}) {
  if (!treatmentPlan && !observations) return null;
  return (
    <div className="space-y-2">
      {treatmentPlan && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Treatment plan</p>
          <p className="text-xs whitespace-pre-line">{treatmentPlan}</p>
        </div>
      )}
      {observations && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Observations</p>
          <p className="text-xs whitespace-pre-line">{observations}</p>
        </div>
      )}
    </div>
  );
}
