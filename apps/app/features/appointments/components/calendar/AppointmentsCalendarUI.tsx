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
import {
  DEFAULT_TIMEZONE,
  formatClinicPickerDayIsoFromSelection,
  formatClinicTodayPickerIso,
  formatDate,
} from "@workspace/utils";
import { useClinic } from "@/lib/clinic-context";

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
  const { clinic } = useClinic();
  const clinicTz = clinic?.timezone?.trim() || DEFAULT_TIMEZONE;
  const selectedDate = date ?? new Date();
  const isTodaySelected =
    formatClinicPickerDayIsoFromSelection(selectedDate, clinicTz) ===
    formatClinicTodayPickerIso(clinicTz);

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
              {formatDate(selectedDate, "EEE, d MMM yyyy")}
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

      <CardContent className="space-y-5 p-0 pb-2">
        <div className="border-b border-border/40 pt-4">
          <Calendar
            mode="single"
            required
            month={calendarMonth}
            onMonthChange={onCalendarMonthChange}
            selected={selectedDate}
            onSelect={onDateSelect}
            modifiers={{
              hasAppointments: (day) =>
                (appointmentCountsByDay.get(
                  formatClinicPickerDayIsoFromSelection(day, clinicTz),
                ) ?? 0) > 0,
            }}
            modifiersClassNames={{
              hasAppointments:
                "relative after:pointer-events-none after:absolute after:top-0.5 after:end-0.5 after:z-20 after:size-2 after:rounded-full after:bg-primary after:ring-2 after:ring-background after:content-[''] aria-selected:after:bg-primary-foreground",
            }}
            captionLayout="dropdown"
            className="w-full max-w-full bg-transparent p-0 [--cell-size:--spacing(8)] [&_[data-day]]:!size-auto [&_[data-day]]:!min-h-0 [&_[data-day]]:!min-w-0 [&_[data-day]]:!h-full [&_[data-day]]:!w-full [&_table]:w-full [&_td]:p-0.5"
            classNames={{ root: "w-full max-w-full" }}
          />
        </div>
        {hasAnyMonthIndicators ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="relative inline-block size-6 shrink-0 rounded-md border border-border/70 bg-muted/30"
              aria-hidden
            >
              <span className="absolute top-0.5 end-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />
            </span>
            <span>Day has scheduled appointments</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
