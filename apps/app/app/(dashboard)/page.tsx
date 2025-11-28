"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Calendar,
  Plus,
  FileText,
  Stethoscope,
  Clock,
  UserPlus,
  ClipboardList,
  Receipt,
  TrendingUp,
  Activity,
  ChevronRight,
  Search,
} from "lucide-react";
import Link from "next/link";
import { GradientStatCard } from "@/components/ui/stats-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/lib/auth-context";
import { apiHooks } from "@/lib/api-hooks";
import { usePermissionStore, Feature } from "@/lib/stores/permission-store";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const { canAccess } = usePermissionStore();
  const { data, isLoading: loading } = apiHooks.useDashboardStats();
  const { data: appointments = [] } = apiHooks.useTodayAppointments();
  const { data: recentPatients = [] } = apiHooks.useRecentPatients(5);

  const stats = data || {
    totalPatients: 0,
    todayAppointments: 0,
    activePrescriptions: 0,
    pendingReports: 0,
  };

  const todayAppointments = [...appointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-96 rounded-2xl lg:col-span-3" />
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Stethoscope className="h-5 w-5" />
            </div>
            <Badge
              variant="secondary"
              className="rounded-full px-3 py-1 text-xs font-medium"
            >
              {format(new Date(), "EEEE, MMMM d")}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreeting()}, {user?.name?.split(" ")[0] || "Doctor"}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening at your clinic today
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Button
            variant="outline"
            className="w-full md:w-64 justify-start text-muted-foreground"
            onClick={() => {
              const event = new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
              });
              document.dispatchEvent(event);
            }}
          >
            <Search className="mr-2 h-4 w-4" />
            Search patients...
            <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
          <Button
            asChild
            size="lg"
            className="rounded-full shadow-lg shadow-primary/20 gap-2"
          >
            <Link href="/patients?action=new">
              <Plus className="h-4 w-4" /> New Patient
            </Link>
          </Button>
          {canAccess(Feature.CALENDAR_SLOTS) && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full gap-2"
            >
              <Link href="/appointments?action=new">
                <Calendar className="h-4 w-4" /> Schedule Visit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GradientStatCard
          title="Total Patients"
          value={stats.totalPatients}
          icon={Users}
          color="blue"
          badge={
            <span className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              Active
            </span>
          }
        />
        <GradientStatCard
          title="Today's Visits"
          value={stats.todayAppointments}
          icon={Calendar}
          color="purple"
          subtitle="scheduled"
        />
        <GradientStatCard
          title="Prescriptions"
          value={stats.activePrescriptions}
          icon={FileText}
          color="green"
          subtitle="this month"
        />
        <GradientStatCard
          title="Pending Codes"
          value={stats.pendingReports}
          icon={ClipboardList}
          color="orange"
          badge={
            stats.pendingReports > 0 ? (
              <Badge
                variant="secondary"
                className="text-xs bg-orange-500/20 text-orange-600 border-0"
              >
                Action needed
              </Badge>
            ) : undefined
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          {
            href: "/patients?action=new",
            icon: UserPlus,
            label: "New Patient",
            color: "blue",
            feature: Feature.BASIC_PATIENT_MANAGEMENT,
          },
          {
            href: "/appointments?action=new",
            icon: Calendar,
            label: "Schedule Visit",
            color: "purple",
            feature: Feature.CALENDAR_SLOTS,
          },
          {
            href: "/coding-queue",
            icon: ClipboardList,
            label: "Coding Queue",
            color: "green",
            badge: stats.pendingReports > 0 ? stats.pendingReports : undefined,
            feature: Feature.MEDICAL_CODING,
          },
          {
            href: "/invoices",
            icon: Receipt,
            label: "Invoices",
            color: "orange",
            feature: Feature.INVOICING,
          },
        ]
          .filter((action) => canAccess(action.feature))
          .map((action) => (
            <Link key={action.href} href={action.href}>
              <Card
                className={cn(
                  "group relative overflow-hidden border transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer h-full",
                  "hover:border-primary/30",
                )}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <div
                    className={cn(
                      "rounded-2xl p-3 mb-3 transition-transform group-hover:scale-110",
                      action.color === "blue" &&
                        "bg-blue-100 dark:bg-blue-900/30",
                      action.color === "purple" &&
                        "bg-purple-100 dark:bg-purple-900/30",
                      action.color === "green" &&
                        "bg-green-100 dark:bg-green-900/30",
                      action.color === "orange" &&
                        "bg-orange-100 dark:bg-orange-900/30",
                    )}
                  >
                    <action.icon
                      className={cn(
                        "h-6 w-6",
                        action.color === "blue" &&
                          "text-blue-600 dark:text-blue-400",
                        action.color === "purple" &&
                          "text-purple-600 dark:text-purple-400",
                        action.color === "green" &&
                          "text-green-600 dark:text-green-400",
                        action.color === "orange" &&
                          "text-orange-600 dark:text-orange-400",
                      )}
                    />
                  </div>
                  <p className="font-medium text-sm">{action.label}</p>
                  {action.badge && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {action.badge} pending
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Today's Schedule */}
        <Card className="lg:col-span-3 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  Today&apos;s Schedule
                </CardTitle>
                <CardDescription>
                  {todayAppointments.length} appointments
                </CardDescription>
              </div>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-full gap-1"
            >
              <Link href="/appointments">
                View All
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayAppointments.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No appointments today"
                  description="Enjoy your free time or schedule a new visit"
                  action={{
                    label: "Schedule an appointment",
                    href: "/appointments?action=new",
                  }}
                />
              ) : (
                todayAppointments.slice(0, 6).map((apt) => (
                  <Link
                    key={apt.id}
                    href={`/consultation/${apt.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-all group border border-transparent hover:border-border"
                  >
                    <div className="flex flex-col items-center justify-center min-w-[56px] rounded-lg bg-primary/5 p-2">
                      <p className="text-lg font-bold text-primary leading-none">
                        {format(new Date(apt.startTime), "h:mm")}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        {format(new Date(apt.startTime), "a")}
                      </p>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <Avatar className="h-11 w-11 border-2 border-background shadow-sm">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
                        {apt.patient?.firstName?.[0]}
                        {apt.patient?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {apt.patient?.firstName} {apt.patient?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {apt.type?.replace(/_/g, " ").toLowerCase()}
                      </p>
                    </div>
                    <StatusBadge status={apt.status} />
                    {apt.status === "scheduled" && (
                      <Button
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        asChild
                      >
                        <Link href={`/consultation/${apt.id}`}>Start</Link>
                      </Button>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Patients */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  Recent Patients
                </CardTitle>
                <CardDescription>{stats.totalPatients} total</CardDescription>
              </div>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-full gap-1"
            >
              <Link href="/patients">
                View All
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentPatients.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No patients yet"
                  description="Add your first patient to get started"
                  action={{
                    label: "Add patient",
                    href: "/patients?action=new",
                  }}
                />
              ) : (
                recentPatients.map((patient) => (
                  <Link
                    key={patient.id}
                    href={`/patients/${patient.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-all group border border-transparent hover:border-border"
                  >
                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
                        {patient.firstName?.[0]}
                        {patient.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-sm">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{patient.phoneNumber}</span>
                        {patient.updatedAt && (
                          <>
                            <span className="text-muted-foreground/30">•</span>
                            <span>
                              {formatDistanceToNow(
                                new Date(patient.updatedAt),
                                { addSuffix: true },
                              )}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Overview */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">
              Quick Overview
            </CardTitle>
            <CardDescription>Your clinic at a glance</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Appointments Today
                </span>
                <span className="font-semibold">
                  {todayAppointments.length}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min((todayAppointments.filter((a) => a.status === "completed").length / Math.max(todayAppointments.length, 1)) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {
                  todayAppointments.filter((a) => a.status === "completed")
                    .length
                }{" "}
                completed
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Patient Growth</span>
                <span className="font-semibold text-green-600">
                  +{stats.newPatientsThisMonth || 0} this month
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: "75%" }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Growing steadily</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Coding Queue</span>
                <span
                  className={cn(
                    "font-semibold",
                    stats.pendingReports > 0
                      ? "text-orange-600"
                      : "text-green-600",
                  )}
                >
                  {stats.pendingReports} pending
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    stats.pendingReports > 5
                      ? "bg-orange-500"
                      : stats.pendingReports > 0
                        ? "bg-yellow-500"
                        : "bg-green-500",
                  )}
                  style={{
                    width:
                      stats.pendingReports > 0
                        ? `${Math.min(stats.pendingReports * 10, 100)}%`
                        : "100%",
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingReports === 0
                  ? "All caught up!"
                  : "Needs attention"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
