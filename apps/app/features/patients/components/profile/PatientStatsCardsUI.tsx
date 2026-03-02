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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="overflow-hidden border border-border bg-card backdrop-blur-md shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-info text-info-foreground shadow-lg shadow-info/30">
              <Activity className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-[10px]">
                Total Visits
              </p>
              <h3 className="text-3xl font-extrabold tracking-tight">
                {showLoading ? "..." : totalVisits}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border border-border bg-card backdrop-blur-md shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success text-success-foreground shadow-lg shadow-success/30">
              <Calendar className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-[10px]">
                Last Visit
              </p>
              <h3 className="text-lg font-bold">
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

      <Card className="overflow-hidden border border-border bg-card backdrop-blur-md shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <Clock className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-[10px]">
                Next Visit
              </p>
              <h3 className="text-lg font-bold">
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

      <Card className="overflow-hidden border border-border bg-card backdrop-blur-md shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning text-warning-foreground shadow-lg shadow-warning/30">
              <TrendingUp className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-[10px]">
                Adherence
              </p>
              <h3 className="text-3xl font-extrabold tracking-tight">
                {showLoading ? "..." : `${adherenceRate}%`}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
