"use client";

import type { ElementType } from "react";
import Link from "next/link";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { ChevronDown, ChevronUp, Pill } from "lucide-react";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
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
        <Link href={action.href}>{action.label}</Link>
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
            <span className="text-muted-foreground">Wt: </span>
            {vitals.weight} kg
          </span>
        )}
      </div>
    </div>
  );
}

// ── Diagnoses expanded section ────────────────────────────────────────────────

export function VisitCardDiagnosisSection({ diagnoses, mode }: { diagnoses: DiagnosisMetadata[]; mode: "full" | "portal" }) {
  if (diagnoses.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">Diagnoses</p>
      <div className="flex flex-wrap gap-1">
        {diagnoses.map((d, i) => (
          <Badge key={i} variant={d.isPrimary ? "default" : "secondary"} className="text-xs h-5">
            {mode !== "portal" && d.code ? `${d.code} · ` : ""}
            {d.description ?? d.code}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ── Medications expanded section ──────────────────────────────────────────────

export function VisitCardMedicationsSection({ medications }: { medications: MedicationMetadata[] }) {
  if (medications.length === 0) return null;
  return <VisitCardMedicationList medications={medications} />;
}

// ── Procedures (treatment plan + observations) ────────────────────────────────

export function VisitCardProceduresSection({
  treatmentPlan,
  observations,
}: {
  treatmentPlan: string | null | undefined;
  observations: string | null | undefined;
}) {
  const hasPlan = Boolean(treatmentPlan?.trim());
  const hasObs = Boolean(observations?.trim());
  if (!hasPlan && !hasObs) return null;

  return (
    <>
      {hasPlan && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Treatment Plan</p>
          <p className="text-xs text-muted-foreground">{treatmentPlan}</p>
        </div>
      )}
      {hasObs && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Observations</p>
          <p className="text-xs text-muted-foreground">{observations}</p>
        </div>
      )}
    </>
  );
}
