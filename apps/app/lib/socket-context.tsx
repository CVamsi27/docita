import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./auth-context";
import { appSession } from "./session";

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
  const logoutRef = useRef(logout);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authRecoveryInFlightRef = useRef(false);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const reconnectSocket = useCallback((newToken: string) => {
    if (socketRef.current) {
      socketRef.current.auth = { token: newToken };
      socketRef.current.connect();
    }
  }, []);

  const reconnect = useCallback(() => {
    if (token && socketRef.current) {
      reconnectSocket(token);
    }
  }, [reconnectSocket, token]);

  const recoverSocketAuth = useCallback(async () => {
    if (authRecoveryInFlightRef.current) return false;
    authRecoveryInFlightRef.current = true;

    try {
      const refreshed = await appSession.refreshAccessToken();
      if (!refreshed) {
        return false;
      }

      const refreshedToken = appSession.getToken();
      if (!refreshedToken) {
        return false;
      }

      reconnectSocket(refreshedToken);
      return true;
    } catch {
      return false;
    } finally {
      authRecoveryInFlightRef.current = false;
    }
  }, [reconnectSocket]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl =
      process.env["NEXT_PUBLIC_SOCKET_URL"] ||
      (process.env["DOCITA_CLOUDFLARE"] === "1"
        ? "https://api.docita.work"
        : "http://localhost:3001");

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
        void (async () => {
          const recovered = await recoverSocketAuth();
          if (!recovered) {
            await logoutRef.current();
            socketInstance.disconnect();
          }
        })();
      }
    });

    socketInstance.on("unauthorized", () => {
      void (async () => {
        const recovered = await recoverSocketAuth();
        if (!recovered) {
          await logoutRef.current();
          socketInstance.disconnect();
        }
      })();
    });

    socketInstance.on("token_refresh", () => {
      if (token) {
        reconnectSocket(token);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      if (socketRef.current === socketInstance) {
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [token, isAuthenticated, reconnectSocket, recoverSocketAuth]);

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
