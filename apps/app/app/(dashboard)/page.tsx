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
  CalendarCheck,
  FileText,
  Stethoscope,
  Clock,
  UserPlus,
  ClipboardList,
  Receipt,
  TrendingUp,
  ChevronRight,
  Search,
  ArrowUpRight,
  Sparkles,
  Play,
  MoreHorizontal,
  Zap,
} from "lucide-react";
import Link from "next/link";
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
    newPatientsThisMonth: 0,
  };

  const todayAppointments = [...appointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  const completedToday = todayAppointments.filter(
    (a) => a.status === "completed",
  ).length;
  const inProgressToday = todayAppointments.filter(
    (a) => a.status === "in-progress",
  ).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const quickActions = [
    {
      href: "/patients?action=new",
      icon: UserPlus,
      label: "New Patient",
      shortLabel: "Patient",
      feature: Feature.BASIC_PATIENT_MANAGEMENT,
    },
    {
      href: "/queue",
      icon: CalendarCheck,
      label: "Today's Patients",
      shortLabel: "Today",
      feature: Feature.QUEUE_MANAGEMENT,
    },
    {
      href: "/appointments?action=new",
      icon: Calendar,
      label: "Schedule",
      shortLabel: "Visit",
      feature: Feature.CALENDAR_SLOTS,
    },
    {
      href: "/coding-queue",
      icon: ClipboardList,
      label: "Queue",
      shortLabel: "Queue",
      badge: stats.pendingReports > 0 ? stats.pendingReports : undefined,
      feature: Feature.MEDICAL_CODING,
    },
    {
      href: "/invoices",
      icon: Receipt,
      label: "Invoice",
      shortLabel: "Bill",
      feature: Feature.INVOICING,
    },
  ].filter((action) => canAccess(action.feature));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-[400px] rounded-2xl lg:col-span-2" />
            <Skeleton className="h-[400px] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25">
                <Stethoscope className="h-6 w-6" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-background"></span>
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), "EEEE, MMMM d")}
              </p>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                {getGreeting()}, {user?.name?.split(" ")[0] || "Doctor"}!
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full md:w-56 justify-start text-muted-foreground bg-background/50 backdrop-blur-sm"
              onClick={() => {
                const event = new KeyboardEvent("keydown", {
                  key: "k",
                  metaKey: true,
                });
                document.dispatchEvent(event);
              }}
            >
              <Search className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Search patients...</span>
              <span className="sm:hidden">Search...</span>
              <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
                ⌘K
              </kbd>
            </Button>
          </div>
        </header>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-full p-1 shrink-0">
            {quickActions.map((action, idx) => (
              <Button
                key={action.href}
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 rounded-full text-xs font-medium relative",
                  idx === 0 &&
                    "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                )}
              >
                <Link href={action.href}>
                  <action.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{action.label}</span>
                  <span className="sm:hidden">{action.shortLabel}</span>
                  {action.badge && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                      {action.badge}
                    </span>
                  )}
                </Link>
              </Button>
            ))}
          </div>
          <div className="h-6 w-px bg-border shrink-0 hidden md:block" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-full text-xs shrink-0"
            asChild
          >
            <Link href="/patients">
              <Users className="h-3.5 w-3.5" />
              All Patients
            </Link>
          </Button>
          {canAccess(Feature.CALENDAR_SLOTS) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-full text-xs shrink-0"
              asChild
            >
              <Link href="/appointments">
                <Calendar className="h-3.5 w-3.5" />
                Calendar
              </Link>
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div
          className={cn(
            "grid gap-3 grid-cols-2",
            canAccess(Feature.CALENDAR_SLOTS)
              ? "lg:grid-cols-4"
              : "lg:grid-cols-3",
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
                          <span className="text-muted-foreground">
                            scheduled
                          </span>
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
                      <p className="text-xs text-muted-foreground">
                        this month
                      </p>
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
                        {stats.pendingReports > 0
                          ? "needs review"
                          : "all done!"}
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

        {/* Main Content */}
        <div
          className={cn(
            "grid gap-6",
            canAccess(Feature.CALENDAR_SLOTS)
              ? "lg:grid-cols-3"
              : "lg:grid-cols-1",
          )}
        >
          {/* Schedule Section */}
          {canAccess(Feature.CALENDAR_SLOTS) && (
            <Card className="lg:col-span-2 border-0 shadow-sm bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">
                        Today&apos;s Schedule
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {todayAppointments.length} appointment
                        {todayAppointments.length !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                  >
                    <Link href="/appointments">
                      View all
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {todayAppointments.length === 0 ? (
                  <div className="py-8">
                    <EmptyState
                      icon={Calendar}
                      title="No appointments today"
                      description="Your schedule is clear. Time to catch up or relax!"
                      action={{
                        label: "Schedule visit",
                        href: "/appointments?action=new",
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayAppointments.slice(0, 5).map((apt, idx) => {
                      const isNext =
                        apt.status === "scheduled" &&
                        !todayAppointments
                          .slice(0, idx)
                          .some((a) => a.status === "scheduled");

                      return (
                        <Link
                          key={apt.id}
                          href={`/consultation/${apt.id}`}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-all group",
                            apt.status === "completed" && "opacity-60",
                            apt.status === "in-progress" &&
                              "bg-primary/5 ring-1 ring-primary/20",
                            isNext && "bg-muted/50",
                            "hover:bg-muted",
                          )}
                        >
                          {/* Time */}
                          <div className="flex flex-col items-center justify-center min-w-[48px] text-center">
                            <p
                              className={cn(
                                "text-sm font-bold leading-none",
                                apt.status === "in-progress" && "text-primary",
                              )}
                            >
                              {format(new Date(apt.startTime), "h:mm")}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase">
                              {format(new Date(apt.startTime), "a")}
                            </p>
                          </div>

                          {/* Divider with status indicator */}
                          <div className="relative h-10 flex items-center">
                            <div className="w-px h-full bg-border" />
                            {apt.status === "in-progress" && (
                              <span className="absolute left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                            )}
                            {apt.status === "completed" && (
                              <span className="absolute left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-green-500" />
                            )}
                          </div>

                          {/* Patient Info */}
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-medium">
                              {apt.patient?.firstName?.[0]}
                              {apt.patient?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {apt.patient?.firstName} {apt.patient?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate capitalize">
                              {apt.type?.replace(/_/g, " ").toLowerCase()}
                            </p>
                          </div>

                          {/* Status & Actions */}
                          <div className="flex items-center gap-2">
                            <StatusBadge status={apt.status} />
                            {(apt.status === "scheduled" ||
                              apt.status === "in-progress") && (
                              <Button
                                size="icon"
                                variant={
                                  apt.status === "in-progress"
                                    ? "default"
                                    : "ghost"
                                }
                                className={cn(
                                  "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
                                  apt.status === "in-progress" && "opacity-100",
                                )}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </Link>
                      );
                    })}

                    {todayAppointments.length > 5 && (
                      <Button
                        asChild
                        variant="ghost"
                        className="w-full h-9 text-xs text-muted-foreground"
                      >
                        <Link href="/appointments">
                          +{todayAppointments.length - 5} more appointments
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Right Column */}
          <div className="space-y-6">
            {/* Recent Patients */}
            <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center text-blue-600">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">
                        Recent Patients
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Last updated
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <Link href="/patients">
                      <MoreHorizontal className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {recentPatients.length === 0 ? (
                  <div className="py-6">
                    <EmptyState
                      icon={Users}
                      title="No patients yet"
                      description="Add your first patient"
                      action={{
                        label: "Add patient",
                        href: "/patients?action=new",
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentPatients.slice(0, 4).map((patient) => (
                      <Link
                        key={patient.id}
                        href={`/patients/${patient.id}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors group"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-medium">
                            {patient.firstName?.[0]}
                            {patient.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {patient.updatedAt
                              ? formatDistanceToNow(
                                  new Date(patient.updatedAt),
                                  {
                                    addSuffix: true,
                                  },
                                )
                              : patient.phoneNumber}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Insights */}
            {canAccess(Feature.CALENDAR_SLOTS) && (
              <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 via-primary/5 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <p className="font-medium text-sm">Today&apos;s Progress</p>
                  </div>

                  <div className="space-y-3">
                    {/* Completion Rate */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Appointments
                        </span>
                        <span className="font-medium">
                          {completedToday}/{todayAppointments.length}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                          style={{
                            width: `${todayAppointments.length > 0 ? (completedToday / todayAppointments.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Quick stat */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-yellow-600" />
                        <span className="text-xs text-muted-foreground">
                          Pending codes
                        </span>
                      </div>
                      <Badge
                        variant={
                          stats.pendingReports > 0 ? "secondary" : "outline"
                        }
                        className="text-[10px] h-5"
                      >
                        {stats.pendingReports}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
