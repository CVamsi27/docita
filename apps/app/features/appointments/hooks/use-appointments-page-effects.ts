"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AppointmentListItem } from "@workspace/data-access";
import { useScrollBehavior } from "@workspace/hooks";
import { REQUESTS_PANEL_FOCUS_PARAM } from "@/features/appointments/lib/appointments-page-helpers";

export function useAppointmentsPageEffects() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentRequestsRef = useRef<HTMLDivElement>(null);
  const focusRequestsPanel = searchParams.get(REQUESTS_PANEL_FOCUS_PARAM);
  const scrollBehavior = useScrollBehavior();

  useEffect(() => {
    if (focusRequestsPanel !== "1") return;
    const timer = window.setTimeout(() => {
      appointmentRequestsRef.current?.scrollIntoView({ behavior: scrollBehavior, block: "start" });
      const next = new URLSearchParams(searchParams.toString());
      next.delete(REQUESTS_PANEL_FOCUS_PARAM);
      const qs = next.toString();
      router.replace(qs.length > 0 ? `/appointments?${qs}` : "/appointments", { scroll: false });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [focusRequestsPanel, router, searchParams, scrollBehavior]);

  const handleScheduleFollowUp = useCallback(
    (appointment: AppointmentListItem) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("action", "new");
      if (appointment.patientId) params.set("patientId", appointment.patientId);
      router.replace(`/appointments?${params.toString()}`);
    },
    [router, searchParams],
  );

  return { appointmentRequestsRef, handleScheduleFollowUp };
}
