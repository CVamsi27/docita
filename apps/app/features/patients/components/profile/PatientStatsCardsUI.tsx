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
      <Card className="overflow-hidden border-none bg-linear-to-br from-blue-500/10 to-blue-500/5 backdrop-blur-md hover:from-blue-500/15 hover:to-blue-500/10 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
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

      <Card className="overflow-hidden border-none bg-linear-to-br from-green-500/10 to-green-500/5 backdrop-blur-md hover:from-green-500/15 hover:to-green-500/10 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500 text-white shadow-lg shadow-green-500/30">
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

      <Card className="overflow-hidden border-none bg-linear-to-br from-purple-500/10 to-purple-500/5 backdrop-blur-md hover:from-purple-500/15 hover:to-purple-500/10 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500 text-white shadow-lg shadow-purple-500/30">
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

      <Card className="overflow-hidden border-none bg-linear-to-br from-orange-500/10 to-orange-500/5 backdrop-blur-md hover:from-orange-500/15 hover:to-orange-500/10 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
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
