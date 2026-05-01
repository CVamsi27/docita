import { Calendar } from "@workspace/ui/components/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { format, isSameDay } from "date-fns";

interface Doctor {
  id: string;
  name: string;
  role: string;
}

interface AppointmentsCalendarUIProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  calendarMonth: Date;
  onCalendarMonthChange: (month: Date) => void;
  appointmentCountsByDay: Map<string, number>;
  canViewAllDoctors: boolean;
  doctorsList: Doctor[];
  selectedDoctorId: string | undefined;
  onDoctorSelect: (id: string | undefined) => void;
}

export function AppointmentsCalendarUI({
  date,
  onDateSelect,
  calendarMonth,
  onCalendarMonthChange,
  appointmentCountsByDay,
  canViewAllDoctors,
  doctorsList,
  selectedDoctorId,
  onDoctorSelect,
}: AppointmentsCalendarUIProps) {
  const selectedDate = date ?? new Date();
  const isTodaySelected = isSameDay(selectedDate, new Date());

  const hasAnyMonthIndicators = appointmentCountsByDay.size > 0;

  return (
    <Card className="h-fit overflow-hidden border-border/60 bg-card/95 shadow-sm">
      <CardHeader className="space-y-3 border-b border-border/60 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Selected date
            </p>
            <CardTitle className="mt-1 truncate text-xl font-semibold tracking-tight">
              {format(selectedDate, "EEE, d MMM yyyy")}
            </CardTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 px-3"
            onClick={() => onDateSelect(new Date())}
            disabled={isTodaySelected}
          >
            Today
          </Button>
        </div>

        {canViewAllDoctors && doctorsList.length > 0 && (
          <Select
            value={selectedDoctorId || "all"}
            onValueChange={(value) =>
              onDoctorSelect(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="h-9 w-full text-sm">
              <SelectValue placeholder="Doctor" />
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
      </CardHeader>

      <CardContent className="space-y-3 p-0 pb-4">
        <div className="border-b border-border/40 px-4 pt-4">
          <Calendar
            mode="single"
            required
            month={calendarMonth}
            onMonthChange={onCalendarMonthChange}
            selected={selectedDate}
            onSelect={onDateSelect}
            modifiers={{
              hasAppointments: (day) =>
                (appointmentCountsByDay.get(format(day, "yyyy-MM-dd")) ?? 0) > 0,
            }}
            modifiersClassNames={{
              hasAppointments:
                "[&_button]:relative [&_button]:after:absolute [&_button]:after:bottom-1 [&_button]:after:left-1/2 [&_button]:after:h-1 [&_button]:after:w-1 [&_button]:after:-translate-x-1/2 [&_button]:after:rounded-full [&_button]:after:bg-primary [&_button]:after:content-['']",
            }}
            captionLayout="dropdown"
            className="w-full max-w-full bg-transparent p-0 [--cell-size:--spacing(8)] [&_[data-day]]:!size-auto [&_[data-day]]:!min-h-0 [&_[data-day]]:!min-w-0 [&_[data-day]]:!h-full [&_[data-day]]:!w-full [&_table]:w-full [&_td]:p-0.5"
            classNames={{ root: "w-full max-w-full" }}
          />
        </div>
        {hasAnyMonthIndicators ? (
          <div className="flex items-center gap-2 px-5 text-xs text-muted-foreground">
            <span
              className="inline-block size-2 shrink-0 rounded-full bg-primary"
              aria-hidden
            />
            <span>Day has scheduled appointments</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
