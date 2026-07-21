import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton
} from "@workspace/ui/components";
import { formatDate } from "@/lib/formatters";

interface AppointmentItem {
  id: string;
  startTime: string | Date;
  status: string;
  dentalChart?: unknown;
}

interface AppointmentListSectionProps {
  selectedPatient: { id?: string } | null;
  appointmentsLoading: boolean;
  appointments: AppointmentItem[];
  selectedAppointmentId: string | null;
  onSelectAppointment: (appointmentId: string) => void;
}

export function AppointmentListSection({
  selectedPatient,
  appointmentsLoading,
  appointments,
  selectedAppointmentId,
  onSelectAppointment,
}: AppointmentListSectionProps) {
  if (!selectedPatient) return null;

  return (
    <Card className="ui-card-surface">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Appointments</CardTitle>
        <CardDescription className="text-xs">
          Select an appointment to view or edit its dental chart
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {appointmentsLoading ? (
          <div
            className="space-y-2"
            role="status"
            aria-live="polite"
            aria-label="Loading appointments"
          >
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : appointments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No appointments found
          </p>
        ) : (
          appointments.slice(0, 10).map((appt) => {
            const hasChart = !!appt.dentalChart;
            return (
              <button
                key={appt.id}
                type="button"
                data-testid="dental-chart-appointment"
                onClick={() =>
                  appt.id && onSelectAppointment(appt.id)
                }
                className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                  selectedAppointmentId === appt.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">
                    {formatDate(appt.startTime)}
                  </p>
                  {hasChart && (
                    <Badge variant="secondary" className="text-xs">
                      Has chart
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground capitalize">
                  {appt.status}
                </p>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
