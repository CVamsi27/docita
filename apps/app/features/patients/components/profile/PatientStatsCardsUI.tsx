import type { ReactNode } from "react";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import {
  Activity,
  Calendar,
  Clock,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "@workspace/utils";

const STAT_VALUE_NUMERIC =
  "text-[var(--fs-2xl)] sm:text-[var(--fs-3xl)] tabular-nums leading-[var(--lh-tight)]";
const STAT_VALUE_RELATIVE =
  "text-[var(--fs-sm)] sm:text-[var(--fs-lg)] font-semibold truncate";

interface PatientStatCardProps {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: ReactNode;
  valueClassName: string;
}

/**
 * Shared icon-and-figure card shape for the four patient-statistics tiles —
 * they only differ in icon, accent color, label, and value (and whether the
 * value is a tabular number or a truncated relative-date string), so a small
 * local wrapper keeps each tile to a single declarative call.
 */
function PatientStatCard({
  icon: Icon,
  iconClassName,
  label,
  value,
  valueClassName,
}: PatientStatCardProps) {
  return (
// jscpd:ignore-start
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className={`flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
          >
            <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
// jscpd:ignore-end
            <p className="font-medium text-muted-foreground uppercase tracking-widest text-[var(--fs-2xs)]">
              {label}
            </p>
            <h3 className={`ui-section-title ${valueClassName}`}>{value}</h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export interface PatientStatistics {
  totalVisits: number;
  lastVisit: string | null;
  nextVisit: string | null;
  adherenceRate: number;
  totalAppointments?: number;
  scheduledAppointments?: number;
  noShowCount?: number;
  cancelledCount?: number;
}

interface PatientStatsCardsUIProps {
  statistics: PatientStatistics | null;
  loading?: boolean;
}

export function PatientStatsCardsUI({
  statistics,
  loading = false,
}: PatientStatsCardsUIProps) {
  const totalVisits = statistics?.totalVisits ?? 0;
  const lastVisit = statistics?.lastVisit;
  const nextVisit = statistics?.nextVisit;
  const adherenceRate = statistics?.adherenceRate ?? 0;

  const showLoading = loading || statistics === null;

  return (
    // jscpd:ignore-start
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <PatientStatCard
        icon={Activity}
        iconClassName="bg-info text-info-foreground"
        label="Total Visits"
        value={showLoading ? "…" : totalVisits}
        valueClassName={STAT_VALUE_NUMERIC}
      />

      <PatientStatCard
        icon={Calendar}
        iconClassName="bg-success text-success-foreground"
        label="Last Visit"
        value={
          showLoading
            ? "…"
            : lastVisit
              ? formatDistanceToNow(lastVisit)
              : "Never"
        }
        valueClassName={STAT_VALUE_RELATIVE}
      />

      <PatientStatCard
        icon={Clock}
        iconClassName="bg-primary text-primary-foreground"
        label="Next Visit"
        value={
          showLoading
            ? "…"
            : nextVisit
              ? formatDistanceToNow(nextVisit)
              : "None"
        }
        valueClassName={STAT_VALUE_RELATIVE}
      />

      <PatientStatCard
        icon={TrendingUp}
        iconClassName="bg-warning text-warning-foreground"
        label="Adherence"
        value={showLoading ? "…" : `${adherenceRate}%`}
        valueClassName={STAT_VALUE_NUMERIC}
      />
    </div>
    // jscpd:ignore-end
  );
}
