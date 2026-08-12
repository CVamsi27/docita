import { useTranslation } from "react-i18next";
import { Clock, Users } from "lucide-react";

import { Avatar, AvatarFallback, Card, CardContent, CardHeader, CardTitle, EmptyState, Section } from "@workspace/ui/components";
import { LiveDot } from "@workspace/ui/components/indicators/live-dot";
import { cn } from "@workspace/ui/lib/utils";
import { getClinicTimezoneOrDefault } from "@/lib/utils/clinic-timezone";
import { useOptionalClinic } from "@/lib/contexts/clinic-context";
import {
  formatScheduled,
  formatToken,
  initialsOf,
  type DeskFloorRow,
} from "./desk-floor-panel-helpers";

interface FloorStatsSectionProps {
  waitingCount: number;
  inProgressCount: number;
  completedCount: number;
}

export function FloorStatsSection({
  waitingCount,
  inProgressCount,
  completedCount,
}: FloorStatsSectionProps) {
  const { t } = useTranslation("Desk");
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-4">
          <p className="ui-eyebrow">{t("floor.waitingLabel")}</p>
          <p className="mt-2 font-display text-3xl font-semibold leading-none tabular-nums text-warning">
            {waitingCount}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("floor.waitingDescription")}
          </p>
        </CardContent>
      </Card>
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-4">
          <p className="flex items-center gap-1.5 ui-eyebrow">
            {inProgressCount > 0 ? (
              <LiveDot tone="cyan" ariaLabel={t("floor.activeConsultationAriaLabel")} />
            ) : null}
            <span>{t("floor.inRoomLabel")}</span>
          </p>
          <p className="mt-2 font-display text-3xl font-semibold leading-none tabular-nums text-info">
            {inProgressCount}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("floor.inRoomDescription")}
          </p>
        </CardContent>
      </Card>
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-4">
          <p className="ui-eyebrow">{t("floor.seenTodayLabel")}</p>
          <p className="mt-2 font-display text-3xl font-semibold leading-none tabular-nums text-success">
            {completedCount}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("floor.seenTodayDescription")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface WaitingListSectionProps {
  waiting: DeskFloorRow[];
}

export function WaitingListSection({ waiting }: WaitingListSectionProps) {
  const { t } = useTranslation("Desk");
  const clinicTimezone = getClinicTimezoneOrDefault(useOptionalClinic()?.clinic);
  return (
    <Section
      id="desk-floor-waiting"
      title={t("floor.upNextTitle")}
      description={
        waiting.length === 0
          ? t("floor.queueClear")
          : t("floor.patientsWaiting", { count: waiting.length })
      }
    >
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-0">
          {waiting.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title={t("floor.noOneWaitingTitle")}
                description={t("floor.noOneWaitingDescription")}
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {waiting.map((row) => (
                <li
                  key={row.id}
                  className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4 px-4 py-3"
                >
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {formatToken(row.tokenNumber)}
                  </span>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="border border-border/70 bg-background/70 text-foreground text-xs font-medium">
                      {initialsOf(row.patientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {row.patientName}
                      {row.isWalkIn ? (
                        <span className="ml-2 rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground">
                          {t("floor.walkInBadge")}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.visitSummary ?? t("floor.noNotes")}
                      {row.doctorName ? ` · ${row.doctorName}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-xs tabular-nums text-muted-foreground",
                    )}
                  >
                    {formatScheduled(row.scheduledTime, clinicTimezone) ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}

interface RecentlyCompletedSectionProps {
  recentlyCompleted: DeskFloorRow[];
}

export function RecentlyCompletedSection({
  recentlyCompleted,
}: RecentlyCompletedSectionProps) {
  const { t } = useTranslation("Desk");
  const clinicTimezone = getClinicTimezoneOrDefault(useOptionalClinic()?.clinic);
  if (recentlyCompleted.length === 0) return null;

  return (
    <Section
      id="desk-floor-completed"
      title={t("floor.recentlySeenTitle")}
      description={t("floor.recentlySeenDescription")}
    >
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden />
            {t("floor.mostRecentFirst")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {recentlyCompleted.map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4 px-4 py-3"
              >
                <span className="font-mono text-sm tabular-nums text-muted-foreground">
                  {formatToken(row.tokenNumber)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {row.patientName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.doctorName ?? ""}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {formatScheduled(row.scheduledTime, clinicTimezone) ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </Section>
  );
}
