"use client";

import { FC } from "react";
import { Button } from "@workspace/ui/components/button";
import { RefreshCw, Settings } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
}

interface QueueHeaderProps {
  onRefresh?: () => void;
  isFetching?: boolean;
  onOpenSettings?: () => void;
  doctors?: Doctor[];
  useDoctorQueues?: boolean;
}

export const QueueHeader: FC<QueueHeaderProps> = ({
  onRefresh,
  isFetching,
  onOpenSettings,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">Patient Queue</h1>
        <p className="text-muted-foreground">Manage today's patient flow</p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Button variant="outline" onClick={onOpenSettings} className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  );
};
