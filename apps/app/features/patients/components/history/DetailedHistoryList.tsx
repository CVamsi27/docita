
import { Card, CardContent } from "@workspace/ui/components/card";
import { Calendar } from "lucide-react";
import { HistoryItem } from "./HistoryItem";

interface DetailedHistoryListProps {
  appointments: any[];
}

export function DetailedHistoryList({ appointments }: DetailedHistoryListProps) {
  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No appointment history</p>
          <p className="text-sm text-muted-foreground">
            This patient has no recorded appointments yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {appointments.map((appointment, index) => (
        <HistoryItem
          key={appointment.id}
          appointment={appointment}
          isLast={index === appointments.length - 1}
        />
      ))}
    </div>
  );
}
