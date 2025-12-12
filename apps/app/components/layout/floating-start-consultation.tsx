"use client";

import { Button } from "@workspace/ui/components/button";
import { Stethoscope, Calendar } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { apiHooks } from "@/lib/api-hooks";
import { useMemo } from "react";
import type { Appointment } from "@workspace/types";
import { usePermissionStore, Feature } from "@/lib/stores/permission-store";
import { useAuth } from "@/lib/auth-context";

interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}

export function FloatingStartConsultation() {
  const router = useRouter();
  const pathname = usePathname();
  const { canAccess } = usePermissionStore();
  const { user } = useAuth();

  // Only fetch appointments for doctors and receptionists
  const shouldFetchAppointments =
    user?.role === "DOCTOR" || user?.role === "RECEPTIONIST";
  const { data: appointmentsResponse } = apiHooks.useTodayAppointments(
    shouldFetchAppointments,
  );

  // Compute next appointment using useMemo
  const nextAppointment = useMemo(() => {
    const now = new Date();
    // Extract items from paginated response
    const paginatedResponse =
      appointmentsResponse as unknown as PaginatedResponse<Appointment>;
    const appointments = paginatedResponse?.items || [];

    return (
      appointments
        .filter(
          (apt: Appointment) =>
            apt.status !== "completed" &&
            apt.status !== "cancelled" &&
            new Date(apt.startTime) <=
              new Date(now.getTime() + 2 * 60 * 60 * 1000), // Within 2 hours
        )
        .sort(
          (a: Appointment, b: Appointment) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        )[0] || null
    );
  }, [appointmentsResponse]);

  // Hide for Tier 0 users who don't have calendar access
  if (!canAccess(Feature.CALENDAR_SLOTS)) {
    return null;
  }

  // Hide on consultation page
  const isConsultationPage = pathname?.startsWith("/consultation/");

  // Don't show on consultation pages
  if (isConsultationPage) {
    return null;
  }

  // If there's a next appointment, show the start consultation button
  if (nextAppointment) {
    const patient = nextAppointment.patient;
    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : "Patient";

    return (
      <div className="fixed bottom-6 right-6 z-40 print:hidden">
        <Button
          size="lg"
          className="h-14 gap-3 rounded-full shadow-2xl shadow-primary/50 hover:shadow-primary/70 transition-all hover:scale-105"
          onClick={() => router.push(`/consultation/${nextAppointment.id}`)}
        >
          <Stethoscope className="h-5 w-5" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold">Start Consultation</span>
            <span className="text-xs opacity-90">{patientName}</span>
          </div>
        </Button>
      </div>
    );
  }

  // Otherwise show a button to schedule/view appointments
  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden">
      <Button
        size="lg"
        variant="secondary"
        className="h-14 gap-3 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105"
        onClick={() => router.push("/appointments")}
      >
        <Calendar className="h-5 w-5" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold">Appointments</span>
          <span className="text-xs opacity-90">View schedule</span>
        </div>
      </Button>
    </div>
  );
}
