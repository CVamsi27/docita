"use client";

import Link from "next/link";
import {
  Users,
  TrendingUp,
  Calendar,
  FileText,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { usePermissionStore, Feature } from "@/lib/stores/permission-store";

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  activePrescriptions: number;
  pendingReports: number;
  newPatientsThisMonth: number;
}

interface DashboardStatsGridProps {
  stats: DashboardStats;
  completedToday: number;
  inProgressToday: number;
}

export function DashboardStatsGrid({
  stats,
  completedToday,
  inProgressToday,
}: DashboardStatsGridProps) {
  const { canAccess } = usePermissionStore();

  return (
    <div
      className={cn(
        "grid gap-3 grid-cols-2",
        canAccess(Feature.CALENDAR_SLOTS) ? "lg:grid-cols-4" : "lg:grid-cols-3",
      )}
    >
      {/* Patients Card */}
      <Link href="/patients" className="group">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-0.5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Patients
                </p>
                <p className="text-2xl md:text-3xl font-bold tracking-tight">
                  {stats.totalPatients}
                </p>
                <p className="text-xs text-green-600 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" />+
                  {stats.newPatientsThisMonth || 0} this month
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Today's Appointments Card */}
      {canAccess(Feature.CALENDAR_SLOTS) && (
        <Link href="/appointments" className="group">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-0.5">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Today
                  </p>
                  <p className="text-2xl md:text-3xl font-bold tracking-tight">
                    {stats.todayAppointments}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    {completedToday > 0 && (
                      <span className="text-green-600">
                        {completedToday} done
                      </span>
                    )}
                    {inProgressToday > 0 && (
                      <span className="text-purple-600 flex items-center gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                        {inProgressToday} now
                      </span>
                    )}
                    {completedToday === 0 && inProgressToday === 0 && (
                      <span className="text-muted-foreground">scheduled</span>
                    )}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Prescriptions Card */}
      {canAccess(Feature.PRESCRIPTION_TEMPLATES) && (
        <Link href="/prescriptions" className="group">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 hover:-translate-y-0.5">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Prescriptions
                  </p>
                  <p className="text-2xl md:text-3xl font-bold tracking-tight">
                    {stats.activePrescriptions}
                  </p>
                  <p className="text-xs text-muted-foreground">this month</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Pending Codes Card */}
      {canAccess(Feature.MEDICAL_CODING) && (
        <Link href="/coding-queue" className="group">
          <Card
            className={cn(
              "relative overflow-hidden border-0 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 hover:-translate-y-0.5",
              stats.pendingReports > 0 && "ring-1 ring-orange-500/20",
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Pending
                  </p>
                  <p className="text-2xl md:text-3xl font-bold tracking-tight">
                    {stats.pendingReports}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      stats.pendingReports > 0
                        ? "text-orange-600"
                        : "text-green-600",
                    )}
                  >
                    {stats.pendingReports > 0 ? "needs review" : "all done!"}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                  <ClipboardList className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
            {stats.pendingReports > 0 && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0 h-5 animate-pulse">
                  Action
                </Badge>
              </div>
            )}
          </Card>
        </Link>
      )}
    </div>
  );
}
