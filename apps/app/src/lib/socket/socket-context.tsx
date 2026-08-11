import { useAuth } from "@/lib/auth/auth-context";
import { useSocketLifecycle } from "./use-socket-lifecycle";
import { SocketContext } from "./socket-context-inner";

export { useSocket } from "./socket-hooks";

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
