"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { ChevronUp, Stethoscope } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { useQueueByDoctor, useStartConsultation } from "@/hooks/api/use-appointments";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

interface FloatingStartConsultationProps {
  patientId?: string;
  appointmentId?: string;
  className?: string;
  minimized?: boolean;
}

export function FloatingStartConsultation({
  patientId,
  appointmentId,
  className,
  minimized = false,
}: FloatingStartConsultationProps) {
  const router = useRouter();
  const { canStartConsultation } = usePermissions();
  const { user } = useAuth();
  const startConsultation = useStartConsultation();
  const [isMinimized, setIsMinimized] = useState(minimized);
  const queueEnabled = canStartConsultation && !appointmentId && !patientId && !!user?.id;
  const { data: doctorQueue } = useQueueByDoctor(
    user?.id,
    undefined,
    queueEnabled,
  );

  const queueCandidate = useMemo(() => {
    if (!doctorQueue || doctorQueue.length === 0) {
      return null;
    }

    return (
      doctorQueue.find(
        (item) =>
          item.appointmentId && item.status.toUpperCase() === "IN_PROGRESS",
      ) ??
      doctorQueue.find(
        (item) => item.appointmentId && item.status.toUpperCase() === "WAITING",
      ) ??
      doctorQueue.find((item) => item.appointmentId) ??
      null
    );
  }, [doctorQueue]);

  const resolvedAppointmentId = appointmentId ?? queueCandidate?.appointmentId;
  const resolvedPatientId = patientId ?? queueCandidate?.patientId;
  const patientName =
    queueCandidate?.patient
      ? `${queueCandidate.patient.firstName} ${queueCandidate.patient.lastName}`
      : null;
  const isResumeFlow =
    queueCandidate?.status?.toUpperCase() === "IN_PROGRESS" && !appointmentId;

  const handleStartConsultation = async () => {
    if (resolvedAppointmentId) {
      try {
        const result = await startConsultation.mutateAsync({
          appointmentId: resolvedAppointmentId,
        });
        router.push(`/consultation/${result.appointmentId}`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to start this consultation",
        );
      }
    } else if (resolvedPatientId) {
      router.push(`/consultation?patientId=${resolvedPatientId}`);
    } else {
      router.push("/consultation");
    }
  };

  if (!resolvedPatientId && !resolvedAppointmentId) {
    return null;
  }

  if (!canStartConsultation) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 transition-opacity duration-150",
        className,
      )}
    >
      {isMinimized ? (
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl"
          onClick={() => setIsMinimized(false)}
        >
          <Stethoscope className="h-6 w-6" />
        </Button>
      ) : (
        <div className="bg-primary text-primary-foreground rounded-2xl shadow-xl p-4 max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              <span className="font-semibold">
                {isResumeFlow ? "Resume Consultation" : "Start Consultation"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsMinimized(true)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-primary-foreground/80 mb-3">
            {patientName
              ? `${isResumeFlow ? "Continue" : "Begin"} consult for ${patientName}.`
              : "Open consultation queue now."}
          </p>
          <Button
            variant="secondary"
            className="w-full"
            disabled={startConsultation.isPending}
            onClick={() => void handleStartConsultation()}
          >
            {isResumeFlow ? "Resume Now" : "Begin Now"}
          </Button>
        </div>
      )}
    </div>
  );
}
