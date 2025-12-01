"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import { FeatureGate, Feature } from "@/components/common/feature-gate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Search,
  Users,
  Clock,
  CheckCircle,
  UserCheck,
  RefreshCw,
  Calendar,
  UserPlus,
  Timer,
  AlertTriangle,
  Settings,
  User,
  Stethoscope,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { apiHooks } from "@/lib/api-hooks";
import { API_URL } from "@/lib/api";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { AddWalkInDialog } from "@/components/queue/add-walk-in-dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function QueuePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: "token" | "type" | "patient" | "doctor" | "time" | "wait" | "status";
    direction: "asc" | "desc";
  }>({
    key: "token",
    direction: "asc",
  });
  const [settingsForm, setSettingsForm] = useState({
    queueBufferMinutes: 10,
    lateArrivalGraceMinutes: 30,
    avgConsultationMinutes: 15,
    useDoctorQueues: false,
  });
  const queryClient = useQueryClient();

  const { data: queueSettings, refetch: refetchSettings } =
    apiHooks.useQueueSettings();
  const {
    data: queue = [],
    isLoading,
    refetch,
    isFetching,
  } = apiHooks.useQueueByDoctor(
    queueSettings?.useDoctorQueues && selectedDoctor
      ? selectedDoctor
      : undefined,
  );
  const { data: stats, refetch: refetchStats } = apiHooks.useQueueStats(
    queueSettings?.useDoctorQueues && selectedDoctor
      ? selectedDoctor
      : undefined,
  );
  const { data: doctors = [] } = apiHooks.useDoctors();
  const updateSettings = apiHooks.useUpdateQueueSettings();

  const handleSort = (
    key: "token" | "type" | "patient" | "doctor" | "time" | "wait" | "status",
  ) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const SortIcon = ({
    column,
  }: {
    column:
      | "token"
      | "type"
      | "patient"
      | "doctor"
      | "time"
      | "wait"
      | "status";
  }) => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground/50" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-2 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-2 h-3 w-3" />
    );
  };

  const filteredQueue = queue
    .filter((item) => {
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
    })
    .sort((a, b) => {
      let aValue: string | number | Date = "";
      let bValue: string | number | Date = "";

      switch (sortConfig.key) {
        case "token":
          aValue = a.tokenNumber || 0;
          bValue = b.tokenNumber || 0;
          break;
        case "type":
          aValue = a.tokenType || "";
          bValue = b.tokenType || "";
          break;
        case "patient":
          aValue = a.patient
            ? `${a.patient.firstName} ${a.patient.lastName}`.toLowerCase()
            : "";
          bValue = b.patient
            ? `${b.patient.firstName} ${b.patient.lastName}`.toLowerCase()
            : "";
          break;
        case "doctor":
          aValue = (
            a.doctor?.name ||
            a.appointment?.doctor?.name ||
            ""
          ).toLowerCase();
          bValue = (
            b.doctor?.name ||
            b.appointment?.doctor?.name ||
            ""
          ).toLowerCase();
          break;
        case "time":
          aValue = new Date(a.scheduledTime || a.createdAt).getTime();
          bValue = new Date(b.scheduledTime || b.createdAt).getTime();
          break;
        case "wait":
          aValue = a.estimatedWaitTime || 0;
          bValue = b.estimatedWaitTime || 0;
          break;
        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          break;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  const handleRefresh = useCallback(() => {
    refetch();
    refetchStats();
    queryClient.invalidateQueries({ queryKey: ["queue"] });
  }, [refetch, refetchStats, queryClient]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`${API_URL}/queue/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("docita_token")}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const statusMessages: Record<string, string> = {
          "in-progress": "Patient called for consultation",
          completed: "Consultation marked as completed",
          "no-show": "Patient marked as no-show",
          cancelled: "Appointment cancelled",
        };
        toast.success(statusMessages[status] || "Status updated");
        handleRefresh();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleOpenSettings = () => {
    if (queueSettings) {
      setSettingsForm({
        queueBufferMinutes: queueSettings.queueBufferMinutes || 10,
        lateArrivalGraceMinutes: queueSettings.lateArrivalGraceMinutes || 30,
        avgConsultationMinutes: queueSettings.avgConsultationMinutes || 15,
        useDoctorQueues: queueSettings.useDoctorQueues || false,
      });
    }
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync(settingsForm);
      toast.success("Queue settings saved");
      setShowSettingsModal(false);
      refetchSettings();
      handleRefresh();
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const getTokenTypeBadge = (tokenType: string) => {
    switch (tokenType) {
      case "scheduled":
        return (
          <Badge
            variant="outline"
            className="gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
          >
            <Calendar className="h-3 w-3" />
            Scheduled
          </Badge>
        );
      case "walk-in":
        return (
          <Badge
            variant="outline"
            className="gap-1 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
          >
            <UserPlus className="h-3 w-3" />
            Walk-in
          </Badge>
        );
      case "late-arrival":
        return (
          <Badge
            variant="outline"
            className="gap-1 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800"
          >
            <AlertTriangle className="h-3 w-3" />
            Late
          </Badge>
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
    <FeatureGate
      feature={Feature.QUEUE_MANAGEMENT}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <h2 className="text-2xl font-bold mb-2">Queue Management</h2>
          <p className="text-muted-foreground mb-4">
            Upgrade to access queue management features
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Today&apos;s Patients
            </h1>
            <p className="text-muted-foreground">
              Manage patient queue - scheduled appointments and walk-ins
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleOpenSettings}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleRefresh}>
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <AddWalkInDialog
              onWalkInAdded={handleRefresh}
              doctors={doctors}
              useDoctorQueues={queueSettings?.useDoctorQueues}
            />
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
              <p className="text-xs text-muted-foreground">
                Appointments today
              </p>
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
                <CardTitle>Patient Queue</CardTitle>
                <CardDescription>
                  Live view of patient queue - scheduled appointments get
                  priority
                </CardDescription>
              </div>
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
                      <th
                        className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleSort("token")}
                      >
                        <div className="flex items-center">
                          Token
                          <SortIcon column="token" />
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleSort("type")}
                      >
                        <div className="flex items-center">
                          Type
                          <SortIcon column="type" />
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleSort("patient")}
                      >
                        <div className="flex items-center">
                          Patient
                          <SortIcon column="patient" />
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleSort("doctor")}
                      >
                        <div className="flex items-center">
                          Doctor
                          <SortIcon column="doctor" />
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleSort("time")}
                      >
                        <div className="flex items-center">
                          Time
                          <SortIcon column="time" />
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleSort("wait")}
                      >
                        <div className="flex items-center">
                          Est. Wait
                          <SortIcon column="wait" />
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center">
                          Status
                          <SortIcon column="status" />
                        </div>
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
                          item.tokenType === "scheduled"
                            ? "bg-blue-50/30 dark:bg-blue-900/10"
                            : ""
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
                          {item.patient?.phoneNumber && (
                            <div className="text-xs text-muted-foreground">
                              {item.patient.phoneNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {item.doctor?.name ||
                            item.appointment?.doctor?.name ||
                            "-"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {item.scheduledTime ? (
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
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
                          {item.status === "waiting" &&
                          item.estimatedWaitTime ? (
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
                        <td className="py-3 px-4">
                          <div className="flex gap-2 justify-end">
                            {/* View Patient Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              asChild
                            >
                              <Link
                                href={`/patients/${item.patientId}?from=queue`}
                              >
                                <User className="h-4 w-4" />
                                View Patient
                              </Link>
                            </Button>

                            {/* Start Consultation Button - for waiting patients */}
                            {item.status === "waiting" && (
                              <Button
                                size="sm"
                                className="gap-1"
                                onClick={() =>
                                  handleUpdateStatus(item.id, "in-progress")
                                }
                                asChild
                              >
                                <Link
                                  href={
                                    item.appointmentId
                                      ? `/consultation/${item.appointmentId}?from=queue`
                                      : `/patients/${item.patientId}?from=queue`
                                  }
                                >
                                  <Stethoscope className="h-4 w-4" />
                                  Start Consultation
                                </Link>
                              </Button>
                            )}

                            {/* Continue Consultation Button - for in-progress patients */}
                            {item.status === "in-progress" && (
                              <Button size="sm" className="gap-1" asChild>
                                <Link
                                  href={
                                    item.appointmentId
                                      ? `/consultation/${item.appointmentId}?from=queue`
                                      : `/patients/${item.patientId}?from=queue`
                                  }
                                >
                                  <Stethoscope className="h-4 w-4" />
                                  Continue
                                </Link>
                              </Button>
                            )}

                            {/* Completed badge */}
                            {item.status === "completed" && (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Completed
                              </Badge>
                            )}

                            {/* No Show badge */}
                            {item.status === "no-show" && (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                No Show
                              </Badge>
                            )}
                          </div>
                        </td>
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

        {/* Settings Dialog */}
        <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Queue Settings</DialogTitle>
              <DialogDescription>
                Configure queue management settings for your clinic.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 items-center gap-4">
                <Label
                  htmlFor="avgConsultationMinutes"
                  className="text-right text-sm"
                >
                  Avg Consultation (min)
                </Label>
                <Input
                  id="avgConsultationMinutes"
                  type="number"
                  value={settingsForm.avgConsultationMinutes}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      avgConsultationMinutes: parseInt(e.target.value) || 15,
                    })
                  }
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label
                  htmlFor="queueBufferMinutes"
                  className="text-right text-sm"
                >
                  Queue Buffer (min)
                </Label>
                <Input
                  id="queueBufferMinutes"
                  type="number"
                  value={settingsForm.queueBufferMinutes}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      queueBufferMinutes: parseInt(e.target.value) || 10,
                    })
                  }
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label
                  htmlFor="lateArrivalGraceMinutes"
                  className="text-right text-sm"
                >
                  Late Grace Period (min)
                </Label>
                <Input
                  id="lateArrivalGraceMinutes"
                  type="number"
                  value={settingsForm.lateArrivalGraceMinutes}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      lateArrivalGraceMinutes: parseInt(e.target.value) || 30,
                    })
                  }
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label htmlFor="useDoctorQueues" className="text-right text-sm">
                  Doctor-specific Queues
                </Label>
                <Button
                  id="useDoctorQueues"
                  variant={settingsForm.useDoctorQueues ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setSettingsForm({
                      ...settingsForm,
                      useDoctorQueues: !settingsForm.useDoctorQueues,
                    })
                  }
                  className="h-9"
                >
                  {settingsForm.useDoctorQueues ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSettingsModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSettings}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  );
}
