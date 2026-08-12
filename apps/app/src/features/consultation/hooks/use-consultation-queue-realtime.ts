import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/lib/socket";

/**
 * Subscribes to Socket.io events relevant to the consultation queue and
 * invalidates React Query caches so the dashboard re-fetches automatically.
 *
 * Events handled:
 * - `clinic:update` — clinic/subscription changes (may affect queue access)
 * - `notification:new` — new notification may signal appointment changes
 * - `payment:update` — payment status changes may affect invoice-sensitive queue rows
 */
export function useConsultationQueueRealtime() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleClinicUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["consultation"] });
    };

    const handleNotification = (notification: {
      type?: string;
      clinicId?: string;
    }) => {
      if (
        notification.type === "APPOINTMENT_CANCELLED" ||
        notification.type === "APPOINTMENT_CHECKED_IN" ||
        notification.type === "APPOINTMENT_COMPLETED"
      ) {
        queryClient.invalidateQueries({ queryKey: ["consultation", "queue"] });
        queryClient.invalidateQueries({ queryKey: ["consultation", "stats"] });
      }
    };

    const handlePaymentUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["consultation"] });
    };

    socket.on("clinic:update", handleClinicUpdate);
    socket.on("notification:new", handleNotification);
    socket.on("payment:update", handlePaymentUpdate);

    return () => {
      socket.off("clinic:update", handleClinicUpdate);
      socket.off("notification:new", handleNotification);
      socket.off("payment:update", handlePaymentUpdate);
    };
  }, [socket, isConnected, queryClient]);
}
