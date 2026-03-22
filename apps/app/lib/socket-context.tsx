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

  const reconnectSocket = (newToken: string) => {
    if (socketRef.current) {
      socketRef.current.auth = { token: newToken };
      socketRef.current.connect();
    }
  };

  const reconnect = () => {
    if (token && socketRef.current) {
      reconnectSocket(token);
    }
  };

  useEffect(() => {
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
    });

    socketInstance.on("disconnect", (reason) => {
      setIsConnected(false);

      if (reason === "io server disconnect") {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (token && socketRef.current) {
            reconnectSocket(token);
          }
        }, 1000);
      }
    });

    socketInstance.on("connect_error", (err) => {
      setIsConnected(false);

      const errorPayload =
        err && typeof err === "object"
          ? (err as { data?: { content?: { message?: string } } }).data
          : undefined;

      if (
        err.message === "Unauthorized" ||
        errorPayload?.content?.message === "Unauthorized"
      ) {
        logout();
        socketInstance.disconnect();
      }
    });

    socketInstance.on("unauthorized", () => {
      logout();
      socketInstance.disconnect();
    });

    socketInstance.on("token_refresh", () => {
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
