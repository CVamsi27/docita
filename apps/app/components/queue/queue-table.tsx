"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  CheckCircle,
  Stethoscope,
  Timer,
  User,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

type SortKey =
  | "token"
  | "type"
  | "patient"
  | "doctor"
  | "time"
  | "wait"
  | "status";

type SortDirection = "asc" | "desc";

interface Patient {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

interface Doctor {
  name: string;
}

interface QueueItem {
  id: string;
  tokenNumber: number;
  tokenType: string;
  status: string;
  patientId: string;
  appointmentId?: string;
  scheduledTime?: string;
  createdAt: string;
  estimatedWaitTime?: number;
  patient?: Patient;
  doctor?: Doctor;
  appointment?: {
    doctor?: Doctor;
  };
}

interface QueueTableProps {
  queue: QueueItem[];
  isLoading: boolean;
  sortConfig: {
    key: SortKey;
    direction: SortDirection;
  };
  onSort: (key: SortKey) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

export function QueueTable({
  queue,
  isLoading,
  sortConfig,
  onSort,
  onUpdateStatus,
}: QueueTableProps) {
  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground/50" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-2 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-2 h-3 w-3" />
    );
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Patient Queue</CardTitle>
            <CardDescription>
              Live view of patient queue - scheduled appointments get priority
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
                    onClick={() => onSort("token")}
                  >
                    <div className="flex items-center">
                      Token
                      <SortIcon column="token" />
                    </div>
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSort("type")}
                  >
                    <div className="flex items-center">
                      Type
                      <SortIcon column="type" />
                    </div>
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSort("patient")}
                  >
                    <div className="flex items-center">
                      Patient
                      <SortIcon column="patient" />
                    </div>
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSort("doctor")}
                  >
                    <div className="flex items-center">
                      Doctor
                      <SortIcon column="doctor" />
                    </div>
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSort("time")}
                  >
                    <div className="flex items-center">
                      Time
                      <SortIcon column="time" />
                    </div>
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSort("wait")}
                  >
                    <div className="flex items-center">
                      Est. Wait
                      <SortIcon column="wait" />
                    </div>
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSort("status")}
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
                {queue.map((item) => (
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
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-end">
                        {/* View Patient Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          asChild
                        >
                          <Link href={`/patients/${item.patientId}?from=queue`}>
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
                              onUpdateStatus(item.id, "in-progress")
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
        {!isLoading && queue.length === 0 && (
          <EmptyState
            icon={Users}
            title="No patients in queue"
            description="Patients will appear here when they check in or walk in"
          />
        )}
      </CardContent>
    </Card>
  );
}
