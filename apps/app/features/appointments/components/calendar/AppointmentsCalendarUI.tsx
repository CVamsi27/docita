// jscpd:ignore-start
import { Button, Calendar, Card, CardContent, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components";
import { DEFAULT_TIMEZONE, formatClinicPickerDayIsoFromSelection, formatClinicPickerIsoLabel, formatClinicTodayPickerIso, pickerIsoToLocalDate } from "@workspace/utils";
import { useClinic } from "@/lib/contexts/clinic-context";

interface Doctor {
  id: string;
  name: string;
  role: string;
}

interface AppointmentsCalendarUIProps {
  selectedPickerIso: string;
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
  selectedPickerIso,
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
  const selectedDate = date ?? pickerIsoToLocalDate(selectedPickerIso);
  const isTodaySelected =
    selectedPickerIso === formatClinicTodayPickerIso(clinicTz);

  const hasAnyMonthIndicators = appointmentCountsByDay.size > 0;

  const headlineDate = formatClinicPickerIsoLabel(
    selectedPickerIso,
    "EEEE",
    clinicTz,
  );
  const headlineSub = formatClinicPickerIsoLabel(
    selectedPickerIso,
    "d MMM yyyy",
    clinicTz,
  );

  return (
    <Card className="h-fit overflow-hidden border-border/60 bg-card shadow-sm">
      <CardHeader className="space-y-3 border-b border-border/60 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-lg font-semibold leading-tight tracking-tight">
              {headlineDate}
            </CardTitle>
            <p className="mt-0.5 truncate text-xs tabular-nums text-muted-foreground">
              {headlineSub}
            </p>
          </div>
          <Button
            type="button"
            variant={isTodaySelected ? "secondary" : "outline"}
            size="sm"
            className="h-8 shrink-0 px-3"
            onClick={() =>
              onDateSelect(pickerIsoToLocalDate(formatClinicTodayPickerIso(clinicTz)))
            }
            disabled={isTodaySelected}
            aria-label="Jump to today"
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
            <SelectTrigger
              className="h-9 w-full text-sm"
              aria-label="Filter by doctor"
            >
              <SelectValue placeholder="Doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All doctors</SelectItem>
              {doctorsList.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  Dr. {doctor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
{/* jscpd:ignore-end */}
      </CardHeader>

      <CardContent className="p-0">
        <div className="px-3 py-4">
          <Calendar
            mode="single"
            required
            month={calendarMonth}
            onMonthChange={onCalendarMonthChange}
            selected={selectedDate}
            onSelect={onDateSelect}
            aria-label="Appointment calendar"
            modifiers={{
              hasAppointments: (day) =>
                (appointmentCountsByDay.get(
                  formatClinicPickerDayIsoFromSelection(day, clinicTz),
                ) ?? 0) > 0,
            }}
            modifiersClassNames={{
              hasAppointments:
                "relative after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:z-20 after:h-1 after:w-1 after:rounded-full after:bg-primary after:content-[''] aria-selected:after:bg-primary-foreground",
            }}
            captionLayout="dropdown"
            className="w-full max-w-full bg-transparent p-0 [--cell-size:--spacing(11)] [&_[data-day]]:!size-auto [&_[data-day]]:!min-h-0 [&_[data-day]]:!min-w-0 [&_[data-day]]:!h-full [&_[data-day]]:!w-full [&_[data-day]]:!gap-0 [&_[data-day]]:tabular-nums [&_[data-day]]:text-[length:var(--fs-sm)] [&_[data-day]]:font-medium [&_table]:w-full [&_td]:p-0.5"
            classNames={{ root: "w-full max-w-full" }}
          />
        </div>
        {hasAnyMonthIndicators ? (
          <div className="flex items-center gap-2 border-t border-border/40 px-4 py-2.5 text-xs text-muted-foreground">
            <span
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40"
              aria-hidden
            >
              <span className="size-1 rounded-full bg-primary" />
            </span>
            <span>Has appointments</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
