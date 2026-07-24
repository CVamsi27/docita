"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/form/button";
import { CalendarPlus, Pencil, Play, Sparkles, Stethoscope, UserPlus } from "lucide-react";
import type { Appointment } from "@workspace/types";
import { AI_FEATURES_ENABLED } from "@/lib/config/ai-features";
import { Feature, usePermissionStore } from "@/lib/stores/permission-store";
import { usePermissions } from "@/hooks/use-permissions";
import { useStartConsultation } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useAskAi } from "@/components/ask-ai/ask-ai-context";

interface PatientHeaderActionsProps {
  patientId: string;
  patientName: string;
  appointments: Appointment[];
  canEditPatient: boolean;
  canCreateAppointment: boolean;
  onScheduleVisit: () => void;
  onEdit: () => void;
}

const isSameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const toDate = (value: string | Date | undefined): Date | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
};

type ConsultationCta =
  | { kind: "continue"; appointmentId: string; label: string }
  | { kind: "start"; appointmentId: string; label: string }
  | { kind: "walkin"; label: string };

export function PatientHeaderActions({
  patientId,
  patientName,
  appointments,
  canEditPatient,
  canCreateAppointment,
  onScheduleVisit,
  onEdit,
}: PatientHeaderActionsProps) {
  const router = useRouter();
  const { canStartConsultation } = usePermissions();
  const { canAccess } = usePermissionStore();
  const startConsultation = useStartConsultation();
  const { openOverlay } = useAskAi();

  const cta: ConsultationCta = useMemo(() => {
    const today = new Date();
    const todayAppts = appointments.filter((appt) => {
      const start = toDate(appt.startTime);
      return start ? isSameLocalDay(start, today) : false;
    });

    const inProgress = todayAppts.find((a) => a.status === "in-progress");
    if (inProgress?.id) {
      return {
        kind: "continue",
        appointmentId: inProgress.id,
        label: "Continue Consultation",
      };
    }

    const upcoming = todayAppts
      .filter(
        (a) =>
          (a.status === "scheduled" ||
            a.status === "confirmed" ||
            a.status === "checked-in") &&
          !!a.id,
      )
      .sort((a, b) => {
        const aTime = toDate(a.startTime)?.getTime() ?? 0;
        const bTime = toDate(b.startTime)?.getTime() ?? 0;
        return aTime - bTime;
      })[0];

    if (upcoming?.id) {
      return {
        kind: "start",
        appointmentId: upcoming.id,
        label: "Start Consultation",
      };
    }

    return { kind: "walkin", label: "Start Walk-In Visit" };
  }, [appointments]);

  const handleConsultationClick = async () => {
    if (cta.kind === "continue") {
      router.push(`/consultation/${cta.appointmentId}`);
      return;
    }

    if (cta.kind === "start") {
      try {
        const result = await startConsultation.mutateAsync({
          appointmentId: cta.appointmentId,
        });
        router.push(`/consultation/${result.appointmentId}`);
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not start this consultation right now. Please try again.",
          "save",
        );
      }
      return;
    }

    router.push(`/consultation?patientId=${patientId}`);
  };

  const showConsultationCta = canStartConsultation;
  const ConsultationIcon =
    cta.kind === "continue"
      ? Stethoscope
      : cta.kind === "start"
        ? Play
        : UserPlus;
  const consultationVariant: "default" | "outline" =
    cta.kind === "walkin" ? "outline" : "default";

  return (
    <>
      {AI_FEATURES_ENABLED && (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            openOverlay({
              id: `patient:${patientId}`,
              label: `on ${patientName}`,
              payload: { kind: "patient", patientId },
            })
          }
          data-testid="patient-ask-ai"
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          Ask AI
        </Button>
      )}

      {showConsultationCta && (
        <Button
          size="sm"
          variant={consultationVariant}
          onClick={() => void handleConsultationClick()}
          disabled={startConsultation.isPending}
        >
          <ConsultationIcon className="h-4 w-4 mr-1.5" />
          {cta.label}
        </Button>
      )}

      {canAccess(Feature.CALENDAR_SLOTS) && canCreateAppointment && (
        <Button size="sm" variant="outline" onClick={onScheduleVisit}>
          <CalendarPlus className="h-4 w-4 mr-1.5" />
          Schedule Visit
        </Button>
      )}

      {canEditPatient && (
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-1.5" />
          Edit
        </Button>
      )}
    </>
  );
}
