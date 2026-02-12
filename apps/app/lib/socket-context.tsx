import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./auth-context";

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

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated, logout } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Reconnect socket with new token
   * Called when token changes or after auth state changes
   */
  const reconnectSocket = (newToken: string) => {
    if (socketRef.current) {
      socketRef.current.auth = { token: newToken };
      socketRef.current.connect();
    }
  };

  /**
   * Manually trigger socket reconnection
   */
  const reconnect = () => {
    if (token && socketRef.current) {
      reconnectSocket(token);
    }
  };

  useEffect(() => {
    // Clean up any pending reconnection timeout
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Only connect if authenticated and token exists
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl =
      process.env["NEXT_PUBLIC_SOCKET_URL"] || "http://localhost:3001";

    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socketInstance;

    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.debug("Socket connected successfully");
    });

    socketInstance.on("disconnect", (reason) => {
      setIsConnected(false);
      console.debug("Socket disconnected:", reason);

      // If disconnected due to server-side auth failure, re-authenticate
      if (reason === "io server disconnect") {
        console.warn("Server disconnected socket, attempting re-authentication");
        // Give server time to process disconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          if (token && socketRef.current) {
            reconnectSocket(token);
          }
        }, 1000);
      }
    });

    socketInstance.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setIsConnected(false);

      const errorPayload =
        err && typeof err === "object"
          ? (err as { data?: { content?: { message?: string } } }).data
          : undefined;

      // If 401 (Unauthorized), trigger re-authentication
      if (
        err.message === "Unauthorized" ||
        errorPayload?.content?.message === "Unauthorized"
      ) {
        console.warn("Socket: Unauthorized error, logging out user");
        logout();
        socketInstance.disconnect();
      }
    });

    /**
     * Handle unauthorized socket events
     * Server sends this if token becomes invalid/expired during connection
     */
    socketInstance.on("unauthorized", () => {
      console.warn("Socket: Unauthorized event received, logging out");
      logout();
      socketInstance.disconnect();
    });

    /**
     * Handle token refresh events from auth
     * Server may send this when token is about to expire
     */
    socketInstance.on("token_refresh", () => {
      console.debug("Socket: Token refresh requested, will reconnect");
      if (token) {
        reconnectSocket(token);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [token, isAuthenticated, logout]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
