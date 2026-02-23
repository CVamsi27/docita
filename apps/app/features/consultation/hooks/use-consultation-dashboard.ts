import { useQueue, useTodayAppointments } from "@/hooks/api/use-appointments";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

export const useConsultationDashboard = () => {
  const router = useRouter();

  // Fetch today's appointments
  const { data: appointmentsData, isLoading: isLoadingAppointments } =
    useTodayAppointments();

  // Fetch active queue
  const { data: queueData, isLoading: isLoadingQueue } = useQueue();

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

  const handleStartConsultation = (appointmentId: string) => {
    router.push(`/consultation/${appointmentId}`);
  };

  return {
    appointments: appointmentsData?.items || [],
    queue: queueData || [],
    stats,
    activeConsultations,
    waitingList,
    isLoading: isLoadingAppointments || isLoadingQueue,
    handleStartConsultation,
    router,
  };
};
