"use client";

import { RefreshCw, Settings } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { AddWalkInDialog } from "@/components/queue/add-walk-in-dialog";

interface Doctor {
  id: string;
  name: string;
}

interface QueueHeaderProps {
  onRefresh: () => void;
  isFetching: boolean;
  onOpenSettings: () => void;
  doctors: Doctor[];
  useDoctorQueues?: boolean;
}

export function QueueHeader({
  onRefresh,
  isFetching,
  onOpenSettings,
  doctors,
  useDoctorQueues,
}: QueueHeaderProps) {
  return (
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
        <Button variant="ghost" size="icon" onClick={onOpenSettings}>
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="outline" className="gap-2" onClick={onRefresh}>
          <RefreshCw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
        <AddWalkInDialog
          onWalkInAdded={onRefresh}
          doctors={doctors}
          useDoctorQueues={useDoctorQueues}
        />
      </div>
    </div>
  );
}
