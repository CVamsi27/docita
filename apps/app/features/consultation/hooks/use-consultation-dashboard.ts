import {
  useAppointments,
  useQueueByDoctor,
  useStartConsultation,
} from "@/hooks/api/use-appointments";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/hooks/use-permissions";

export const useConsultationDashboard = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { canStartConsultation } = usePermissions();
  const today = new Date().toISOString().split("T")[0] ?? "";
  const shouldScopeToOwnConsultations =
    user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR";
  const doctorId = shouldScopeToOwnConsultations ? user?.id : undefined;

  const { data: appointmentsData, isLoading: isLoadingAppointments } =
    useAppointments({
      date: today,
      ...(doctorId ? { doctorId } : {}),
    });

  const { data: queueData, isLoading: isLoadingQueue } =
    useQueueByDoctor(doctorId);
  const startConsultation = useStartConsultation();

  const stats = useMemo(() => {
    const today = appointmentsData?.items || [];
    const queue = queueData || [];

    return {
      scheduledToday: today.length,
      waiting: queue.filter((q) => q.status === "waiting").length,
      inProgress: queue.filter((q) => q.status === "in-progress").length,
      completed: queue.filter((q) => q.status === "completed").length,
    };
  }, [appointmentsData, queueData]);

  const activeConsultations = useMemo(() => {
    return (queueData || []).filter((q) => q.status === "in-progress");
  }, [queueData]);

  const waitingList = useMemo(() => {
    return (queueData || []).filter((q) => q.status === "waiting");
  }, [queueData]);

  const handleStartConsultation = async (appointmentId: string) => {
    try {
      const result = await startConsultation.mutateAsync({ appointmentId });
      router.push(`/consultation/${result.appointmentId}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to start this consultation",
      );
    }
  };

  return {
    appointments: appointmentsData?.items || [],
    queue: queueData || [],
    stats,
    activeConsultations,
    waitingList,
    isLoading: isLoadingAppointments || isLoadingQueue,
    handleStartConsultation,
    canStartConsultation,
    isStartingConsultation: startConsultation.isPending,
    currentUserId: user?.id,
    router,
  };
};
