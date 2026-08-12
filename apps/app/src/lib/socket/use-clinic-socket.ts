import { useEffect } from "react";
import { useSocket } from "./socket-context";

export interface ClinicUpdateData {
  clinicId: string;
  tier?: string;
  intelligenceAddon?: string;
  subscriptionStatus?: string;
  subscriptionGraceUntil?: string | null;
}

export function useClinicSocket(
  clinicId: string | null,
  onUpdate: (data: ClinicUpdateData) => void,
) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !clinicId) return;

    socket.emit("subscribe:clinic", clinicId);
    socket.on("clinic:update", onUpdate);

    return () => {
      socket.off("clinic:update", onUpdate);
    };
  }, [socket, isConnected, clinicId, onUpdate]);
}
