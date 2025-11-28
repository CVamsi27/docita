/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  Users, 
  Calendar, 
  Plus, 
  FileText,
  ArrowUpRight,
  Stethoscope,
  Pill
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { StatCard } from "@/components/dashboard/stat-card"
import { AppointmentCard } from "@/components/dashboard/appointment-card"
import { apiHooks } from "@/lib/api-hooks"

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading: loading } = apiHooks.useDashboardStats()
  
  const stats = data?.stats || {
    totalPatients: 0,
    todayAppointments: 0,
    activePrescriptions: 0,
    pendingReports: 0
  }
  const upcomingAppointments = data?.upcomingAppointments || []
  const recentActivity = data?.recentActivity || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-6 md:p-8 text-primary-foreground shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="h-6 w-6" />
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome back, {user?.name || "Doctor"}!
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base">
              Here&apos;s what&apos;s happening with your clinic today.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" variant="secondary" className="shadow-lg">
              <Link href="/patients?action=new">
                <Plus className="mr-2 h-5 w-5" /> Add Patient
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white">
              <Link href="/appointments?action=new">
                <Calendar className="mr-2 h-5 w-5" /> New Appointment
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Patients"
          value={(stats?.totalPatients || 0).toLocaleString()}
          change="+12.5%" // TODO: Implement trend calculation
          trend="up"
          icon={Users}
          iconClassName="text-blue-600 dark:text-blue-400"
          iconBgClassName="bg-blue-50 dark:bg-blue-950/30"
        />
        <StatCard
          title="Today's Appointments"
          value={(stats?.todayAppointments || 0).toString()}
          change={`${stats?.todayAppointments || 0} scheduled`}
          trend="neutral"
          icon={Calendar}
          iconClassName="text-purple-600 dark:text-purple-400"
          iconBgClassName="bg-purple-50 dark:bg-purple-950/30"
        />
        <StatCard
          title="Active Prescriptions"
          value={(stats?.activePrescriptions || 0).toLocaleString()}
          change="+8.2%" // TODO: Implement trend calculation
          trend="up"
          icon={Pill}
          iconClassName="text-green-600 dark:text-green-400"
          iconBgClassName="bg-green-50 dark:bg-green-950/30"
        />
        <StatCard
          title="Pending Reports"
          value={(stats?.pendingReports || 0).toString()}
          change="-2 from yesterday"
          trend="down"
          icon={FileText}
          iconClassName="text-orange-600 dark:text-orange-400"
          iconBgClassName="bg-orange-50 dark:bg-orange-950/30"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-5">
        {/* Upcoming Appointments - Wider */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-xl">Upcoming Appointments</CardTitle>
              <CardDescription>Today&apos;s schedule</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/appointments" className="flex items-center gap-1">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No appointments scheduled for today.</p>
              ) : (
                upcomingAppointments.map((apt: any, index: number) => (
                  <AppointmentCard
                    key={index}
                    time={apt.time}
                    patient={apt.patient}
                    type={apt.type}
                    status={apt.status}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-1 lg:col-span-3 shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-xl">Recent Activity</CardTitle>
            <CardDescription>Latest updates from your clinic</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
              ) : (
                recentActivity.map((activity: any, index: number) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-full ${activity.className} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                      {activity.initials}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.patient}</p>
                      <p className="text-sm text-muted-foreground">{activity.action}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
