import { createContext, useContext } from "react";
import type { Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth/auth-context";
import { useSocketLifecycle } from "./use-socket-lifecycle";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  reconnect: () => {},
});

export function SocketProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const { token, isAuthenticated, logout } = useAuth();
  const { socket, isConnected, reconnect } = useSocketLifecycle({
    enabled,
    token,
    isAuthenticated,
    logout,
  });

  return (
    <SocketContext.Provider value={{ socket, isConnected, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined)
    throw new Error("useSocket must be used within a SocketProvider");
  return context;
};
