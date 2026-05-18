import {
  DEFAULT_TIMEZONE,
  formatClinicPickerDayIsoFromSelection,
} from "@workspace/utils";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { useClinic } from "@/lib/contexts/clinic-context";

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
  const { clinic } = useClinic();
  const clinicTz = clinic?.timezone?.trim() || DEFAULT_TIMEZONE;

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
                formatClinicPickerDayIsoFromSelection(selectedDate, clinicTz) ===
                  formatClinicPickerDayIsoFromSelection(
                    schedule.getValue(),
                    clinicTz,
                  ) &&
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
