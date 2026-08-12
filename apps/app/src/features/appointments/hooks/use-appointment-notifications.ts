import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/lib/socket";

interface NotificationPayload {
  id: string;
  clinicId: string;
  userId: string | null;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  priority: string;
  createdAt: string;
}

/**
 * Subscribes to Socket.io notification events and invalidates the relevant
 * React Query caches so the inbox and appointment lists stay current.
 *
 * Events handled:
 * - `notification:new` — new notification (appointment reminder, cancellation, etc.)
 * - `notification:read` — notification marked as read in another session
 * - `notification:deleted` — notification deleted in another session
 * - `notification:bulk-delete` — bulk notification deletion
 */
export function useAppointmentNotifications() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const invalidateNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const handleNewNotification = (_notification: NotificationPayload) => {
      invalidateNotifications();

      // If the notification is related to appointments, invalidate those too
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    };

    const handleNotificationRead = () => {
      invalidateNotifications();
    };

    const handleNotificationDeleted = () => {
      invalidateNotifications();
    };

    const handleBulkDelete = () => {
      invalidateNotifications();
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:read", handleNotificationRead);
    socket.on("notification:deleted", handleNotificationDeleted);
    socket.on("notification:bulk-delete", handleBulkDelete);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:read", handleNotificationRead);
      socket.off("notification:deleted", handleNotificationDeleted);
      socket.off("notification:bulk-delete", handleBulkDelete);
    };
  }, [socket, isConnected, queryClient]);
}
