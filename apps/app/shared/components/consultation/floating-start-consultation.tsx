"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { ChevronUp, Stethoscope } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { useQueueByDoctor, useStartConsultation } from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth-context";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

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
  const { canAccess, currentTier, hasIntelligence } =
    usePermissionStore();
  const startConsultation = useStartConsultation();
  const [isMinimized, setIsMinimized] = useState(minimized);
  const canAccessQueueApi = canAccessTarget(
    APP_ACCESS_TARGETS.API_QUEUE,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      currentTier,
      hasIntelligence,
    },
    "read",
  );
  const queueEnabled =
    canStartConsultation &&
    canAccessQueueApi &&
    !appointmentId &&
    !patientId &&
    !!user?.id;
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
        showUserFacingErrorToast(
          error,
          "We could not start this consultation. Please try again.",
          "save",
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
        "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 transition-opacity duration-150",
        className,
      )}
    >
      {isMinimized ? (
        <SymbolTooltip
          label={
            isResumeFlow ? "Resume consultation" : "Open start consultation"
          }
        >
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-md hover:shadow-lg"
            onClick={() => setIsMinimized(false)}
            aria-label={
              isResumeFlow ? "Resume consultation" : "Open start consultation"
            }
          >
            <Stethoscope className="h-6 w-6" />
          </Button>
        </SymbolTooltip>
      ) : (
        <div className="bg-primary text-primary-foreground rounded-lg shadow-md p-4 w-[calc(100vw-2rem)] max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              <span className="font-semibold">
                {isResumeFlow ? "Resume Consultation" : "Start Consultation"}
              </span>
            </div>
            <SymbolTooltip label="Minimize">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setIsMinimized(true)}
                aria-label="Minimize"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </SymbolTooltip>
          </div>
          <p className="text-sm text-primary-foreground/80 mb-3">
            {patientName
              ? `${isResumeFlow ? "Continue" : "Begin"} consult for ${patientName}.`
              : "Open consultation queue now"}
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
