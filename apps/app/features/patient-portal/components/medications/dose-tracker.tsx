"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Check, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@workspace/utils";
import {
  usePortalDoseHistory,
  useRecordPortalDose,
} from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  mapPortalDoseRow,
  type PortalDoseStatus,
} from "@/features/patient-portal/lib/map-portal-records";
import { isRecord } from "@workspace/utils";

interface DoseTrackerProps {
  medicationId: string;
  medicationName: string;
  prescriptionId?: string;
}

export function DoseTracker({
  medicationId,
  medicationName,
  prescriptionId,
}: DoseTrackerProps) {
  const [notes, setNotes] = useState("");

  const { data: history, isLoading } = usePortalDoseHistory({
    prescriptionId,
    limit: 10,
  });

  const recordDose = useRecordPortalDose();

  const handleRecord = async (status: "TAKEN" | "MISSED" | "SKIPPED") => {
    try {
      await recordDose.mutateAsync({
        medicationId,
        status,
        takenAt: status === "TAKEN" ? new Date().toISOString() : undefined,
        notes: notes || undefined,
      });
      toast.success(
        status === "TAKEN"
          ? "Dose recorded: taken"
          : status === "MISSED"
            ? "Dose recorded: missed"
            : "Dose skipped",
      );
      setNotes("");
    } catch {
      showUserFacingErrorToast(
        "We could not record this dose. Please try again.",
      );
    }
  };

  const statusConfig: Record<
    PortalDoseStatus,
    { icon: typeof Check; color: string; bg: string }
  > = {
    TAKEN: { icon: Check, color: "text-success", bg: "bg-success/10" },
    MISSED: { icon: X, color: "text-destructive", bg: "bg-destructive/10" },
    SKIPPED: { icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    PENDING: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
    ADMINISTERED: {
      icon: Check,
      color: "text-success",
      bg: "bg-success/10",
    },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Track: {medicationName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Record today&apos;s dose</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-success text-success hover:bg-success/10"
              onClick={() => handleRecord("TAKEN")}
              disabled={recordDose.isPending}
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Took it
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => handleRecord("MISSED")}
              disabled={recordDose.isPending}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Missed
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRecord("SKIPPED")}
              disabled={recordDose.isPending}
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Skip
            </Button>
          </div>
        </div>

        {!isLoading && history && history.doses.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Recent doses</p>
            <div className="space-y-1.5">
              {history.doses
                .slice(0, 5)
                .filter(isRecord)
                .map((dose) => {
                  const doseRecord = mapPortalDoseRow(dose);
                  const config =
                    statusConfig[doseRecord.status] ?? statusConfig.PENDING;
                  const Icon = config.icon;
                  return (
                    <div
                      key={doseRecord.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-6 w-6 rounded-full flex items-center justify-center ${config.bg}`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                        </div>
                        <span className="text-muted-foreground">
                          {formatDate(doseRecord.scheduledAt, "d MMM, hh:mm a")}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${config.color}`}
                      >
                        {doseRecord.status.toLowerCase()}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
