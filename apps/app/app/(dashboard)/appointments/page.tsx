"use client";

import {
  useState,
  useCallback,
  useMemo,
  Suspense,
  useEffect,
  memo,
} from "react";

import { Calendar } from "@workspace/ui/components/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { format } from "date-fns";
import { apiHooks } from "@/lib/api-hooks";
import { AddAppointmentDialog } from "@/components/appointments/add-appointment-dialog";
import {
  Clock,
  User,
  Stethoscope,
  CalendarDays,
  UserCheck,
  Check,
  Loader2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useSearchParams, useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { FeatureGate } from "@/components/common/feature-gate";
import { Feature } from "@/lib/stores/permission-store";
import Link from "next/link";
import { toast } from "sonner";
import type { Appointment } from "@workspace/types";

function AppointmentsContent() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const selectedDateStr = date ? date.toISOString().split("T")[0] : undefined;
  const {
    data: appointments = [],
    isLoading: loading,
    refetch,
  } = apiHooks.useAppointments({ date: selectedDateStr });
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Open dialog from URL params
  const currentAction = searchParams.get("action");
  useEffect(() => {
    if (currentAction === "new") {
      setIsAddDialogOpen(true);
    }
  }, [currentAction]);

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setIsAddDialogOpen(open);
      if (!open) {
        // Remove the query param when dialog closes
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("action");
        newParams.delete("patientId");
        router.replace(`/appointments?${newParams.toString()}`);
      }
    },
    [searchParams, router],
  );

  // Deduplicate appointments by id to prevent double display
  const uniqueAppointments = useMemo(() => {
    const seen = new Set<string>();
    return appointments.filter((apt) => {
      if (!apt.id || seen.has(apt.id)) return false;
      seen.add(apt.id);
      return true;
    });
  }, [appointments]);

  // Sort appointments by time (already filtered by date from API)
  const filteredAppointments = useMemo(
    () =>
      [...uniqueAppointments].sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      ),
    [uniqueAppointments],
  );

  const preselectedPatientId = useMemo(
    () => searchParams.get("patientId") || undefined,
    [searchParams],
  );

  const handleStartConsultation = useCallback(
    (appointmentId: string) => {
      router.push(`/consultation/${appointmentId}`);
    },
    [router],
  );

  const handleCheckIn = useCallback(
    async (appointmentId: string) => {
      setCheckingIn(appointmentId);
      try {
        const response = await fetch(`/api/queue/check-in/${appointmentId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to check in");
        }

        toast.success("Patient checked in to queue");
        // Optimistic update - refetch to get latest data
        await refetch();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to check in",
        );
      } finally {
        setCheckingIn(null);
      }
    },
    [refetch],
  );

  return (
    <FeatureGate
      feature={Feature.CALENDAR_SLOTS}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
          <CalendarDays className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">
            Appointment Scheduling
          </h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            Manage patient appointments with an intuitive calendar. Upgrade to
            Core tier to unlock this feature.
          </p>
          <Button asChild>
            <Link href="/settings?tab=subscription">Upgrade to Core</Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground">
              Schedule and manage patient appointments.
            </p>
          </div>
          <AddAppointmentDialog
            onAppointmentAdded={() => refetch()}
            selectedDate={date}
            open={isAddDialogOpen}
            onOpenChange={handleDialogChange}
            preselectedPatientId={preselectedPatientId}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          <Card className="h-fit border-border shadow-sm">
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border border-border"
              />
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>
                Schedule for{" "}
                {date ? format(date, "MMMM d, yyyy") : "Selected Date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading appointments...
                  </div>
                ) : filteredAppointments.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="No appointments scheduled"
                    description="No appointments scheduled for this day."
                    className="h-[300px] border-2 border-dashed border-border rounded-lg bg-muted/10"
                  />
                ) : (
                  <div className="space-y-4">
                    {filteredAppointments.map((apt) => (
                      <AppointmentCard
                        key={apt.id}
                        appointment={apt}
                        allAppointments={filteredAppointments}
                        checkingIn={checkingIn}
                        onCheckIn={handleCheckIn}
                        onStartConsultation={handleStartConsultation}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </FeatureGate>
  );
}

// Memoized appointment card component to prevent unnecessary re-renders
const AppointmentCard = memo<{
  appointment: Appointment;
  allAppointments: Appointment[];
  checkingIn: string | null;
  onCheckIn: (id: string) => void;
  onStartConsultation: (id: string) => void;
}>(
  ({
    appointment: apt,
    allAppointments,
    checkingIn,
    onCheckIn,
    onStartConsultation,
  }) => {
    // Determine if this is the "Next Up" appointment
    const isNextUp = useMemo(() => {
      return (
        apt.status !== "completed" &&
        apt.status !== "cancelled" &&
        new Date(apt.startTime) > new Date() &&
        allAppointments
          .filter(
            (a) =>
              a.status !== "completed" &&
              a.status !== "cancelled" &&
              new Date(a.startTime) > new Date(),
          )
          .sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
          )[0]?.id === apt.id
      );
    }, [apt, allAppointments]);

    return (
      <div
        className={`flex items-center justify-between p-4 border rounded-lg transition-all bg-card ${
          isNextUp
            ? "border-primary/50 shadow-md ring-1 ring-primary/20 bg-primary/5"
            : "border-border hover:bg-muted/50"
        }`}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="flex flex-col items-center justify-center w-16 h-16 bg-primary/10 rounded-md text-primary">
            <span className="text-lg font-bold">
              {format(new Date(apt.startTime), "HH:mm")}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold flex items-center gap-2 text-foreground">
              <User className="h-4 w-4 text-muted-foreground" />
              {apt.patient
                ? `${apt.patient.firstName} ${apt.patient.lastName}`
                : `Patient ID: ${apt.patientId}`}
              \n{" "}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              {format(new Date(apt.startTime), "h:mm a")} -{" "}
              {format(new Date(apt.endTime), "h:mm a")}
              <span className="capitalize px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                {apt.type}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={apt.status === "confirmed" ? "default" : "secondary"}>
            {apt.status}
          </Badge>
          {/* Check-in button for confirmed appointments */}
          {apt.status === "confirmed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCheckIn(apt.id!)}
              disabled={checkingIn === apt.id}
              className="gap-1"
            >
              {checkingIn === apt.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              Check-in
            </Button>
          )}
          {/* Show checked-in badge */}
          {apt.status === "checked-in" && (
            <Badge
              variant="secondary"
              className="gap-1 bg-green-50 text-green-700"
            >
              <Check className="h-3 w-3" />
              In Queue
            </Badge>
          )}
          <Button
            size="sm"
            variant={apt.status === "completed" ? "outline" : "default"}
            onClick={() => onStartConsultation(apt.id!)}
          >
            <Stethoscope className="mr-2 h-4 w-4" />
            {apt.status === "completed" ? "View" : "Start"}
          </Button>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  toast.info("Cancel action triggered");
                  // Implement cancel logic here
                }}
                className="text-destructive focus:text-destructive"
              >
                Cancel Appointment
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  toast.info("No Show action triggered");
                  // Implement no-show logic here
                }}
              >
                Mark as No Show
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  },
);

AppointmentCard.displayName = "AppointmentCard";

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AppointmentsContent />
    </Suspense>
  );
}
