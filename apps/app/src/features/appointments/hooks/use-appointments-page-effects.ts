import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { AppointmentListItem } from "@workspace/data-access";
import { useScrollBehavior } from "@workspace/hooks";
import { REQUESTS_PANEL_FOCUS_PARAM } from "@/features/appointments/lib/appointments-page-helpers";

export function useAppointmentsPageEffects() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentRequestsRef = useRef<HTMLDivElement>(null);
  const focusRequestsPanel = searchParams.get(REQUESTS_PANEL_FOCUS_PARAM);
  const scrollBehavior = useScrollBehavior();

  useEffect(() => {
    if (focusRequestsPanel !== "1") return;
    const timer = window.setTimeout(() => {
      appointmentRequestsRef.current?.scrollIntoView({
        behavior: scrollBehavior,
        block: "start",
      });
      const next = new URLSearchParams(searchParams.toString());
      next.delete(REQUESTS_PANEL_FOCUS_PARAM);
      const qs = next.toString();
      navigate(qs.length > 0 ? `/appointments?${qs}` : "/appointments", {
        replace: true,
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [focusRequestsPanel, navigate, searchParams, scrollBehavior]);

  const handleScheduleFollowUp = useCallback(
    (appointment: AppointmentListItem) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("action", "new");
      if (appointment.patientId) params.set("patient", appointment.patientId);
      navigate(`/appointments?${params.toString()}`);
    },
    [navigate, searchParams],
  );

  return { appointmentRequestsRef, handleScheduleFollowUp };
}
