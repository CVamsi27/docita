import { useCallback, useRef, useSyncExternalStore } from "react";
import { useSocket } from "@/lib/contexts/socket-context";

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

  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useSyncExternalStore(
    useCallback(
      (notify) => {
        if (!socket || !isConnected || !clinicId) return () => {};

        socket.emit("subscribe:clinic", clinicId);

        const handleClinicUpdate = (data: ClinicUpdateData) => {
          callbackRef.current(data);
          notify();
        };

        socket.on("clinic:update", handleClinicUpdate);

        return () => {
          socket.off("clinic:update", handleClinicUpdate);
        };
      },
      [socket, isConnected, clinicId],
    ),
    () => null,
    () => null,
  );
}
