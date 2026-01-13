import { Calendar } from "@workspace/ui/components/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
    <div className="space-y-4">
      {/* Doctor Selector for Admin/Receptionist */}
      {canViewAllDoctors && doctorsList.length > 0 && (
        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              View Doctor&apos;s Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedDoctorId || "all"}
              onValueChange={(value) =>
                onDoctorSelect(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="w-full">
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
          </CardContent>
        </Card>
      )}

      <Card className="h-fit border-border shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base">Calendar</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onDateSelect}
            className="rounded-md border-0"
          />
        </CardContent>
      </Card>
    </div>
  );
}
