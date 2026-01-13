import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Clock } from "lucide-react";
import { StatusBadge } from "@workspace/ui/components/status-badge";
import { HistoryObservations } from "./sections/HistoryObservations";
import { HistoryVitals } from "./sections/HistoryVitals";
import { HistoryPrescription } from "./sections/HistoryPrescription";
import { HistoryInvoice } from "./sections/HistoryInvoice";
import { HistoryDiagnoses } from "./sections/HistoryDiagnoses";

interface HistoryItemProps {
  appointment: any; // Using any to avoid deep type issues
  isLast: boolean;
}

export function HistoryItem({ appointment, isLast }: HistoryItemProps) {
  return (
    <Card className="relative overflow-hidden">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-8 top-24 bottom-0 w-0.5 bg-border -mb-6" />
      )}

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Timeline dot */}
            <div className="relative shrink-0">
              <div className="h-4 w-4 rounded-full bg-primary ring-4 ring-background" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">
                  {new Date(appointment.startTime).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardTitle>
                <StatusBadge status={appointment.status} />
              </div>
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                {new Date(appointment.startTime).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                <span className="mx-1">•</span>
                <span className="capitalize">{appointment.type}</span>
                {appointment.doctor && (
                  <>
                    <span className="mx-1">•</span>
                    <span>{appointment.doctor.name}</span>
                  </>
                )}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pl-12 space-y-4">
        <HistoryObservations observations={appointment.observations} />
        <HistoryVitals vitalSign={appointment.vitalSign} />
        <HistoryPrescription prescription={appointment.prescription} />
        <HistoryInvoice invoice={appointment.invoice} />

        {/* Notes */}
        {appointment.notes && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              {/* Re-using FileText icon implicity or import if needed, but context is clear */}
              Clinical Notes
            </div>
            <p className="text-sm text-muted-foreground">{appointment.notes}</p>
          </div>
        )}

        <HistoryDiagnoses diagnoses={appointment.diagnoses} />
      </CardContent>
    </Card>
  );
}
