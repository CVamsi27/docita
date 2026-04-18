import { Card, CardContent } from "@workspace/ui/components/card";
import { Activity, Calendar, Clock, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <Card className="overflow-hidden border border-border bg-card shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-info text-info-foreground">
              <Activity className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-muted-foreground uppercase tracking-widest text-[var(--fs-2xs)]">
                Total Visits
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {showLoading ? "..." : totalVisits}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border border-border bg-card shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-success text-success-foreground">
              <Calendar className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-muted-foreground uppercase tracking-widest text-[var(--fs-2xs)]">
                Last Visit
              </p>
              <h3 className="text-sm sm:text-lg font-bold truncate">
                {showLoading
                  ? "..."
                  : lastVisit
                    ? formatDistanceToNow(new Date(lastVisit), {
                        addSuffix: true,
                      })
                    : "Never"}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border border-border bg-card shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Clock className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-muted-foreground uppercase tracking-widest text-[var(--fs-2xs)]">
                Next Visit
              </p>
              <h3 className="text-sm sm:text-lg font-bold truncate">
                {showLoading
                  ? "..."
                  : nextVisit
                    ? formatDistanceToNow(new Date(nextVisit), {
                        addSuffix: true,
                      })
                    : "None"}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border border-border bg-card shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-warning text-warning-foreground">
              <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-muted-foreground uppercase tracking-widest text-[var(--fs-2xs)]">
                Adherence
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {showLoading ? "..." : `${adherenceRate}%`}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
