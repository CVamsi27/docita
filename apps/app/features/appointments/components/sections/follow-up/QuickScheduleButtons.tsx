
import { format } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";

interface QuickScheduleButtonsProps {
  quickSchedules: Array<{ label: string; getValue: () => Date }>;
  onQuickSchedule: (date: Date) => void;
  selectedDate: Date | undefined;
}

export function QuickScheduleButtons({
  quickSchedules,
  onQuickSchedule,
  selectedDate,
}: QuickScheduleButtonsProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">
        Quick Schedule
      </Label>
      <div className="flex flex-wrap gap-2">
        {quickSchedules.map((schedule) => (
          <Button
            key={schedule.label}
            variant="outline"
            size="sm"
            onClick={() => onQuickSchedule(schedule.getValue())}
            className={cn(
              "text-xs",
              selectedDate &&
                format(selectedDate, "yyyy-MM-dd") ===
                  format(schedule.getValue(), "yyyy-MM-dd") &&
                "border-primary bg-primary/5",
            )}
          >
            {schedule.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
