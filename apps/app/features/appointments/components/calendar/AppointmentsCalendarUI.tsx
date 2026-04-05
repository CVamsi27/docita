import { Calendar } from "@workspace/ui/components/calendar";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

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
    <Card className="h-fit border border-border shadow-sm bg-card">
      <CardContent className="p-3 space-y-3">
        {canViewAllDoctors && doctorsList.length > 0 && (
          <Select
            value={selectedDoctorId || "all"}
            onValueChange={(value) =>
              onDoctorSelect(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-full h-9 text-sm">
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

        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateSelect}
          className="w-full [--cell-size:--spacing(9)]"
        />
      </CardContent>
    </Card>
  );
}
