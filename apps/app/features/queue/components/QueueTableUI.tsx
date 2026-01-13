"use client";

import { FC } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Play, CheckCircle } from "lucide-react";

type QueueItemStatus =
  | "waiting"
  | "in-progress"
  | "completed"
  | "no-show"
  | "cancelled";

interface Patient {
  id?: string;
  firstName?: string;
  lastName?: string;
}

interface Doctor {
  id?: string;
  name?: string;
}

interface QueueItem {
  id?: string;
  tokenNumber?: number;
  tokenType?: string;
  patientId?: string;
  appointmentId?: string;
  doctorId?: string;
  clinicId?: string;
  status?: string;
  priority?: number;
  notes?: string;
  calledAt?: string;
  completedAt?: string;
  scheduledTime?: string;
  estimatedDuration?: number;
  consultationStart?: string;
  patient?: Patient;
  doctor?: Doctor;
  appointment?: {
    id?: string;
    type?: string;
    doctor?: Doctor;
  };
  waitTime?: number;
  estimatedWaitTime?: number;
  checkInTime?: string;
  createdAt?: string;
}

// Use the SortKey type from the hook for type safety
type SortKey =
  | "token"
  | "type"
  | "patient"
  | "doctor"
  | "time"
  | "wait"
  | "status";

interface SortConfig {
  key: SortKey;
  direction: "asc" | "desc";
}

interface QueueTableProps {
  queue?: QueueItem[];
  isLoading?: boolean;
  sortConfig?: SortConfig;
  onSort?: (key: SortKey) => void;
  onUpdateStatus?: (id: string, status: string) => void;
}

const getStatusBadgeVariant = (status?: string) => {
  switch (status) {
    case "in-progress":
      return "default";
    case "completed":
      return "secondary";
    case "no-show":
      return "destructive";
    default:
      return "outline";
  }
};

export const QueueTable: FC<QueueTableProps> = ({
  queue = [],
  isLoading,
  onUpdateStatus,
}) => {
  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading queue...
        </CardContent>
      </Card>
    );
  }

  if (queue.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="py-12 text-center text-muted-foreground">
          No patients in queue
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Current Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {queue.map((item, i) => (
            <div
              key={item.id || i}
              className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 border"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium">
                    {item.patient?.firstName} {item.patient?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Wait: {item.waitTime ?? 0} min •{" "}
                    {item.appointment?.type ?? "Consultation"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={getStatusBadgeVariant(item.status)}
                  className="capitalize"
                >
                  {item.status?.replace("-", " ") ?? "waiting"}
                </Badge>
                {item.status === "waiting" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      item.id && onUpdateStatus?.(item.id, "in-progress")
                    }
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                )}
                {item.status === "in-progress" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      item.id && onUpdateStatus?.(item.id, "completed")
                    }
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Complete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export type { QueueItem, QueueItemStatus, QueueTableProps };
