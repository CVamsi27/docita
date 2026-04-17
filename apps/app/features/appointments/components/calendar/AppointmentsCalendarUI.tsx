import { Calendar } from "@workspace/ui/components/calendar";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { format } from "date-fns";

interface Doctor {
  id: string;
  name: string;
  role: string;
}

interface AppointmentsCalendarUIProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  canViewAllDoctors: boolean;
  doctorsList: Doctor[];
  selectedDoctorId: string | undefined;
  onDoctorSelect: (id: string | undefined) => void;
}

export function AppointmentsCalendarUI({
  date,
  onDateSelect,
  canViewAllDoctors,
  doctorsList,
  selectedDoctorId,
  onDoctorSelect,
}: AppointmentsCalendarUIProps) {
  return (
    <Card className="h-fit border-border/60 bg-card/90 shadow-sm backdrop-blur">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Selected date
            </p>
            <p className="truncate text-sm font-semibold">
              {format(date ?? new Date(), "EEE, d MMM yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5"
              onClick={() => onDateSelect(new Date())}
            >
              Today
            </Button>
          </div>
        </div>

        {canViewAllDoctors && doctorsList.length > 0 && (
          <Select
            value={selectedDoctorId || "all"}
            onValueChange={(value) =>
              onDoctorSelect(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="h-9 w-full text-sm">
              <SelectValue placeholder="All Doctors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doctors</SelectItem>
              {doctorsList.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  Dr. {doctor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="rounded-2xl border border-border/60 bg-background/60 p-2">
          <Calendar
            mode="single"
            required
            selected={date ?? new Date()}
            onSelect={onDateSelect}
            className="w-full p-0 [--cell-size:--spacing(9)] sm:[--cell-size:--spacing(10)]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
