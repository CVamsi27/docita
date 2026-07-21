"use client";

import { Clock, Users } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Section
} from "@workspace/ui/components";
import { LiveDot } from "@workspace/ui/components/indicators/live-dot";
import { cn } from "@workspace/ui/lib/utils";

export interface DeskFloorRow {
  id: string;
  tokenNumber: number;
  patientName: string;
  scheduledTime?: string | null;
  doctorName?: string | null;
  visitSummary?: string | null;
  isWalkIn: boolean;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function formatToken(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatScheduled(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export interface FloorStatsSectionProps {
  waitingCount: number;
  inProgressCount: number;
  completedCount: number;
}

export function FloorStatsSection({
  waitingCount,
  inProgressCount,
  completedCount,
}: FloorStatsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-4">
          <p className="ui-eyebrow">Waiting</p>
          <p className="mt-2 font-display text-3xl font-semibold leading-none tabular-nums text-warning">
            {waitingCount}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            In the queue right now
          </p>
        </CardContent>
      </Card>
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-4">
          <p className="flex items-center gap-1.5 ui-eyebrow">
            {inProgressCount > 0 ? (
              <LiveDot tone="cyan" ariaLabel="Active consultation" />
            ) : null}
            <span>In room</span>
          </p>
          <p className="mt-2 font-display text-3xl font-semibold leading-none tabular-nums text-info">
            {inProgressCount}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Currently with a doctor
          </p>
        </CardContent>
      </Card>
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-4">
          <p className="ui-eyebrow">Seen today</p>
          <p className="mt-2 font-display text-3xl font-semibold leading-none tabular-nums text-success">
            {completedCount}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Completed consultations
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export interface WaitingListSectionProps {
  waiting: DeskFloorRow[];
}

export function WaitingListSection({ waiting }: WaitingListSectionProps) {
  return (
    <Section
      id="desk-floor-waiting"
      title="Up next"
      description={
        waiting.length === 0
          ? "Queue is clear."
          : `${waiting.length} patient${waiting.length === 1 ? "" : "s"} waiting`
      }
    >
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-0">
          {waiting.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No one waiting"
                description="Tokens called from here will appear on the now-serving board and on the patient's WhatsApp."
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
                          Walk-in
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.visitSummary ?? "No notes"}
                      {row.doctorName ? ` · ${row.doctorName}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-xs tabular-nums text-muted-foreground",
                    )}
                  >
                    {formatScheduled(row.scheduledTime) ?? "—"}
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

export interface RecentlyCompletedSectionProps {
  recentlyCompleted: DeskFloorRow[];
}

export function RecentlyCompletedSection({
  recentlyCompleted,
}: RecentlyCompletedSectionProps) {
  if (recentlyCompleted.length === 0) return null;

  return (
    <Section
      id="desk-floor-completed"
      title="Recently seen"
      description="Last patients sent home today"
    >
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden />
            Most recent first
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
                  {formatScheduled(row.scheduledTime) ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </Section>
  );
}
