"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Search,
  Plus,
  Users,
  Clock,
  CheckCircle,
  PlayCircle,
  UserCheck,
  SkipForward,
  RefreshCw,
  Calendar,
  UserPlus,
  Timer,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { apiHooks } from "@/lib/api-hooks";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

export default function QueuePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");

  const { data: queueSettings } = apiHooks.useQueueSettings();
  const {
    data: queue = [],
    isLoading,
    refetch,
  } = apiHooks.useQueueByDoctor(
    queueSettings?.useDoctorQueues && selectedDoctor
      ? selectedDoctor
      : undefined,
  );
  const { data: stats } = apiHooks.useQueueStats(
    queueSettings?.useDoctorQueues && selectedDoctor
      ? selectedDoctor
      : undefined,
  );
  const { data: doctors = [] } = apiHooks.useDoctors();

  const filteredQueue = queue.filter((item) => {
    const patientName = item.patient
      ? `${item.patient.firstName} ${item.patient.lastName}`.toLowerCase()
      : "";
    const doctorName =
      item.doctor?.name?.toLowerCase() ||
      item.appointment?.doctor?.name?.toLowerCase() ||
      "";
    const tokenStr =
      `A${String(item.tokenNumber).padStart(3, "0")}`.toLowerCase();
    const search = searchQuery.toLowerCase();

    return (
      patientName.includes(search) ||
      tokenStr.includes(search) ||
      doctorName.includes(search)
    );
  });

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await apiHooks.useUpdateQueueToken(id).mutateAsync({ status });
      refetch();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const getTokenTypeBadge = (tokenType: string) => {
    switch (tokenType) {
      case "scheduled":
        return (
          <Badge
            variant="outline"
            className="gap-1 bg-blue-50 text-blue-700 border-blue-200"
          >
            <Calendar className="h-3 w-3" />
            Scheduled
          </Badge>
        );
      case "walk-in":
        return (
          <Badge
            variant="outline"
            className="gap-1 bg-gray-50 text-gray-700 border-gray-200"
          >
            <UserPlus className="h-3 w-3" />
            Walk-in
          </Badge>
        );
      case "late-arrival":
        return (
          <Badge
            variant="outline"
            className="gap-1 bg-orange-50 text-orange-700 border-orange-200"
          >
            <AlertTriangle className="h-3 w-3" />
            Late
          </Badge>
        );
      default:
        return null;
    }
  };

  const getActionButtons = (item: (typeof queue)[0]) => {
    switch (item.status) {
      case "waiting":
        return (
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => handleUpdateStatus(item.id, "in-progress")}
            >
              <PlayCircle className="h-4 w-4" />
              Call
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-destructive"
              onClick={() => handleUpdateStatus(item.id, "no-show")}
            >
              <SkipForward className="h-4 w-4" />
              No Show
            </Button>
          </div>
        );
      case "in-progress":
        return (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => handleUpdateStatus(item.id, "completed")}
          >
            <CheckCircle className="h-4 w-4" />
            Complete
          </Button>
        );
      default:
        return null;
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatWaitTime = (minutes: number | undefined) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Queue Management
          </h1>
          <p className="text-muted-foreground">
            Manage patient waiting queue - scheduled appointments and walk-ins
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Walk-in
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {stats?.waiting ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">In waiting room</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {stats?.scheduled ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Appointments today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Walk-ins</CardTitle>
            <UserPlus className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {stats?.walkIns ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Direct visits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              In Consultation
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats?.inProgress ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Being seen now</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Wait</CardTitle>
            <Timer className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {stats?.avgWaitTime ? `${stats.avgWaitTime}m` : "-"}
            </div>
            <p className="text-xs text-muted-foreground">Wait time today</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient, token, or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {queueSettings?.useDoctorQueues && (
          <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Doctors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Doctors</SelectItem>
              {doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Today&apos;s Queue</CardTitle>
              <CardDescription>
                Live view of patient queue - scheduled appointments get priority
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Queue Settings</p>
                  <p className="text-xs text-muted-foreground">
                    Buffer: ±{queueSettings?.queueBufferMinutes ?? 10}min | Late
                    grace: {queueSettings?.lateArrivalGraceMinutes ?? 30}min
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState message="Loading queue..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Token
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Patient
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Doctor
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Time
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Est. Wait
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b hover:bg-muted/50 transition-colors ${
                        item.tokenType === "scheduled" ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-lg">
                          A{String(item.tokenNumber).padStart(3, "0")}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getTokenTypeBadge(item.tokenType)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">
                          {item.patient
                            ? `${item.patient.firstName} ${item.patient.lastName}`
                            : "Unknown"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {item.doctor?.name ||
                          item.appointment?.doctor?.name ||
                          "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {item.scheduledTime ? (
                            <span className="text-blue-600 font-medium">
                              {formatTime(item.scheduledTime)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {formatTime(item.createdAt)}
                            </span>
                          )}
                        </div>
                        {item.scheduledTime && (
                          <div className="text-xs text-muted-foreground">
                            Checked in: {formatTime(item.createdAt)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.status === "waiting" && item.estimatedWaitTime ? (
                          <Badge variant="secondary" className="gap-1">
                            <Timer className="h-3 w-3" />
                            {formatWaitTime(item.estimatedWaitTime)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3 px-4">{getActionButtons(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && filteredQueue.length === 0 && (
            <EmptyState
              icon={Users}
              title="No patients in queue"
              description="Patients will appear here when they check in or walk in"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
